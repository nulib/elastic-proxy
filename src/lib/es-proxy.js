const AWS = require("aws-sdk");
const url = require("url");
const isArray = require("lodash.isarray");
const isNull = require("lodash.isnull");
const isObject = require("lodash.isobject");
const isString = require("lodash.isstring");
const util = require("util");
const AWSUtils = require("./aws-utils");

class ESProxy {
  constructor(req) {
    this.req = req;

    this.allowedHeaders = [
      "Accept",
      "Access-Control-Request-Headers",
      "Access-Control-Request-Method",
      "Accept-Language",
      "Content-Type",
      "Origin",
      "Referer",
    ];
  }

  isNotLoggedIn() {
    return isNull(this.req.user);
  }

  isReadingRoom() {
    const forwardedFor = this.req.headers['x-forwarded-for']?.split(/\,/);
    const requestIps = new Array(this.req._remoteAddress).concat(forwardedFor).filter((v) => v !== undefined);
    const readingRoomIps = this.req.app.get("reading-room-ips");
    const overlap = requestIps.filter(x => readingRoomIps.includes(x));
    return overlap.length > 0;
  }

  passthruHeaders() {
    let result = {};
    this.allowedHeaders.forEach((header) => {
      let value = this.req.get(header);
      if (value != null) {
        result[header] = value;
      }
    });
    if (result["Content-Type"] == null) {
      result["Content-Type"] = "application/json";
    }
    return result;
  }

  filter(query) {
    if (!isObject(query)) return query;

    const haveVisibility = (visibility) => {
      return { 
        bool: { 
          should: [
            { term: { visibility: visibility } },
            { term: { visibility: visibility.toUpperCase() } },
            { term: { "visibility.id": visibility } },
            { term: { "visibility.id": visibility.toUpperCase() } },
          ],
          minimum_should_match: 1
        } 
      }
    }
    const matchTheQuery = query;
    const beUnpublished = { term: { published: false } }

    if (this.isReadingRoom()) {
      console.debug("Request coming from reading room. Allowing access to all works.")
      return {
        bool: {
          must: [matchTheQuery],
          must_not: [beUnpublished]
        }
      }
    } else if (this.isNotLoggedIn()) {
      console.debug("Request is anonymous. Allowing access to public works.")
      return {
        bool: {
          must: [matchTheQuery, haveVisibility('open')],
          must_not: [beUnpublished]
        }
      }
    } else {
      console.debug("Request is authorized. Allowing access to restricted works.")
      return {
        bool: {
          must: [matchTheQuery],
          must_not: [haveVisibility('restricted'), beUnpublished],
        }
      }
    }
  }

  wrapQuery(payload) {
    let wrapFunction = (doc) => {
      if (doc.scroll_id) { return doc; }
      doc.query = this.filter(doc.query || { match_all: {} });
      doc.track_total_hits = true;
      return doc;
    }

    if (isArray(payload)) {
      if (payload.length > 1) {
        let result = [];
        for (var i = 0; i < payload.length; i += 2) {
          result.push(payload[i]);
          result.push(wrapFunction(payload[i+1]));
        }
        return result;
      } else {
        return this.wrapQuery(payload[0]);
      }
    } else if (isObject(payload)) {
      return wrapFunction(payload);
    } else {
      return payload;
    }
  }

  async makeRequest() {
    let requestHeaders = this.passthruHeaders();
    let requestUrl = url.resolve(this.req.app.get("upstream"), this.req.path);

    let parsedUrl = url.parse(this.req.originalUrl);
    let query = new url.URLSearchParams(parsedUrl.query);
    query.delete('q');
    requestUrl = [requestUrl, query.toString()].join("?");

    let body;
    if (
      ["GET", "POST"].indexOf(this.req.method) > -1 &&
      isObject(this.req.body)
    ) {
      let payload = this.wrapQuery(this.req.body);
      body = payload.map
        ? payload.map((doc) => JSON.stringify(doc)).join("\n") + "\n"
        : JSON.stringify(payload);
    } else {
      body = "{}";
    }

    return await AWSUtils.makeRequest(this.req.method, requestUrl, requestHeaders, body);
  }

  // Explicitly unpublished docs are visible to no one
  // Otherwise:
  //   * `open` docs are visible to all
  //   * `restricted` docs are visible to no one
  //   * `authenticated` docs are visible to logged in users
  isBlocked(doc) {
    if (doc._source.published == false) {
      return true;
    }

    var visibility = doc._source.visibility;
    if (isObject(visibility) && isString(visibility.id)) {
      visibility = visibility.id.toLowerCase();
    } else if (util.isString(visibility)) {
      visibility = visibility.toLowerCase();
    } else {
      visibility = null;
    }

    switch (visibility) {
      case 'open':
        return false;
      case 'restricted':
        return !this.isReadingRoom();
      case 'authenticated':
        return this.isNotLoggedIn() &! this.isReadingRoom(); 
      default:
        return false;
    }
  }

  async performPassthru() {
    let request = await this.makeRequest();
    let response = await AWSUtils.awsFetch(request);

    return new Promise((resolve, reject) => {
      response.body = "";
      response.on("data", (chunk) => {
        response.body += chunk;
      });
      response.on("end", () => {
        if (/\/json(?:;.+)$/.test(response.headers["content-type"])) {
          var doc = JSON.parse(response.body);

          if (doc.found && doc._type == '_doc' && this.isBlocked(doc)) {
            response.statusCode = 403;
            response.body = '{ type: "error", message: "Unauthorized" }';
          }
        }
        resolve(response);
      });
    });
  }

  passthru(res) {
    this.performPassthru().then((response) => {
      res.status(response.statusCode)
         .set(response.headers)
         .postProcess()
         .send(Buffer.from(response.body));
    });
  }
}

module.exports = ESProxy;

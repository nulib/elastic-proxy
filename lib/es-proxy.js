const AWS = require("aws-sdk");
const url = require("url");
const isNull = require("lodash.isnull");
const isObject = require("lodash.isobject");
const isString = require("lodash.isstring");
const util = require("util");

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

    if (this.isNotLoggedIn()) {
      return {
        bool: {
          must: [matchTheQuery, haveVisibility('open')],
          must_not: [beUnpublished]
        }
      }
    } else {
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
      return doc;
    }
    if (payload.map) {
      return payload.map(wrapFunction);
    } else if (isObject(payload)) {
      return wrapFunction(payload);
    } else {
      return payload;
    }
  }

  async awsFetch(request) {
    return new Promise((resolve, reject) => {
      var client = new AWS.HttpClient();
      client.handleRequest(
        request,
        null,
        (response) => resolve(response),
        (error) => reject(error)
      );
    });
  }

  extractQuery(str) {
    var qMark = str.indexOf("?");
    return qMark == -1 ? null : str.slice(qMark + 1);
  }

  async makeRequest() {
    return new Promise((resolve, reject) => {
      let requestHeaders = this.passthruHeaders();
      let chain = new AWS.CredentialProviderChain();
      let requestUrl = url.resolve(this.req.app.get("upstream"), this.req.path);
      let queryString = this.extractQuery(this.req.originalUrl);
      if (!isNull(queryString)) {
        requestUrl = [requestUrl, queryString].join("?");
      }
      let request = new AWS.HttpRequest(requestUrl, "us-east-1");
      request.method = this.req.method;
      request.headers["Host"] = url.parse(requestUrl).host;
      if (
        ["GET", "POST"].indexOf(this.req.method) > -1 &&
        isObject(this.req.body)
      ) {
        let payload = this.wrapQuery(this.req.body);
        request.body = payload.map
          ? payload.map((doc) => JSON.stringify(doc)).join("\n") + "\n"
          : JSON.stringify(payload);
      } else {
        request.body = "{}";
      }
      request.headers["Content-Length"] = new util.TextEncoder().encode(
        request.body
      ).length;
      for (var header in requestHeaders) {
        request.headers[header] = requestHeaders[header];
      }

      chain.resolve((err, credentials) => {
        if (err) {
          console.log("WARNING: ", err);
          console.log("Returning unsigned request");
        } else {
          var signer = new AWS.Signers.V4(request, "es");
          signer.addAuthorization(credentials, new Date());
        }
        resolve(request);
      });
    });
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
        return true;
      case 'authenticated':
        return this.isNotLoggedIn(); 
      default:
        return false;
    }
  }
  
  async performPassthru() {
    let request = await this.makeRequest();
    let response = await this.awsFetch(request);

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

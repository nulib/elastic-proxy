const authUtils = require('./auth-utils');
const request = require('request');
const url = require('url');

class ESProxy {
  constructor(req) {
    this.req = req;

    this.allowedHeaders = [
      "Accept", "Access-Control-Request-Headers",
      "Access-Control-Request-Method", "Accept-Language", "Content-Type",
      "Origin", "Referer"
    ];
  }

  isRestricted() {
    return this.req.user == null;
  }

  passthruHeaders() {
    let result = {};
    this.allowedHeaders.forEach(header => {
      let value = this.req.get(header);
      if (value != null) {
        result[header] = value
      }
    });
    if (result['Content-Type'] == null) {
      result['Content-Type'] = 'application/json';
    }
    return result;
  }

  filter(query) {
    if (this.isRestricted()) {
      return {
        bool: {
          must: [ query ],
          must_not: [ { term: { visibility: 'authenticated' } } ]
        }
      }
    } else {
      return query
    }
  }

  wrapQuery(payload) {
    let wrapFunction = (doc) => {
      doc.query = this.filter(doc.query);
      return doc;
    }
    return payload.map ? payload.map(wrapFunction) : payload;
  }

  passthru(res) {
    let requestHeaders = this.passthruHeaders();
    let requestParams = {
      method: this.req.method,
      url: url.resolve(this.req.app.get('upstream'), this.req.path),
      headers: requestHeaders
    }

    if (['GET','POST'].indexOf(this.req.method) > -1) {
      let payload = this.wrapQuery(this.req.body);
      requestParams.body = payload.map ? payload.map(doc => JSON.stringify(doc)).join("\n") + "\n" : JSON.stringify(payload);
    }

    request(
      requestParams,
      (err, proxyResponse, proxyResponseBody) => {
        if (err) {
          throw(err);
        } else {
          res.status(proxyResponse.statusCode)
             .set(proxyResponse.headers)
             .postProcess()
          res.send(new Buffer(proxyResponseBody));
        }
      }
    );
  }
}

module.exports = ESProxy;

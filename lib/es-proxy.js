const AWS = require('aws-sdk');
const authUtils = require('./auth-utils');
const request = require('request');
const url = require('url');
const isNull = require('lodash.isnull');
const isObject = require('lodash.isobject');

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
    if (!isObject(query)) return query;

    if (this.isRestricted()) {
      return {
        bool: {
          must: [query, {
            term: {
              visibility: 'open'
            }
          }]
        }
      }
    } else {
      return {
        bool: {
          must: [query],
          must_not: [{
            term: {
              visibility: 'restricted'
            }
          }]
        }
      }
    }
  }

  wrapQuery(payload) {
    let wrapFunction = (doc) => {
      doc.query = this.filter(doc.query);
      return doc;
    }
    return payload.map ? payload.map(wrapFunction) : payload;
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
    var qMark = str.indexOf('?');
    return qMark == -1 ? null : str.slice(qMark + 1)
  }

  async makeRequest() {
    return new Promise((resolve, reject) => {
      let requestHeaders = this.passthruHeaders();
      let chain = new AWS.CredentialProviderChain();
      let requestUrl = url.resolve(this.req.app.get('upstream'), this.req.path);
      let queryString = this.extractQuery(this.req.originalUrl);
      if (!isNull(queryString)) {
        requestUrl = [requestUrl, queryString].join('?')
      }
      let request = new AWS.HttpRequest(requestUrl, 'us-east-1');
      request.method = this.req.method;
      request.headers['Host'] = url.parse(requestUrl).host;
      if (['GET', 'POST'].indexOf(this.req.method) > -1 && isObject(this.req.body)) {
        let payload = this.wrapQuery(this.req.body);
        request.body = payload.map ? payload.map(doc => JSON.stringify(doc)).join("\n") + "\n" : JSON.stringify(payload);
      } else {
        request.body = '{}';
      }
      request.headers['Content-Length'] = request.body.length;
      for (var header in requestHeaders) {
        request.headers[header] = requestHeaders[header]
      }

      chain.resolve((err, credentials) => {
        if (err) {
          console.log('WARNING: ', err);
          console.log('Returning unsigned request');
        } else {
          var signer = new AWS.Signers.V4(request, 'es');
          signer.addAuthorization(credentials, new Date());
        }
        resolve(request);
      });
    });
  }

  async performPassthru() {
    let request = await this.makeRequest();
    let response = await this.awsFetch(request);

    return new Promise((resolve, reject) => {
      response.body = '';
      response.on('data', (chunk) => {
        response.body += chunk;
      });
      response.on('end', () => {
        if (/\/json(?:;.+)$/.test(response.headers['content-type'])) {
          var doc = JSON.parse(response.body);
          var deauthorize = false;
          if (doc._type == '_doc' && doc._source.visibility != 'open') {
            deauthorize = this.isRestricted() || doc._source.visibility == 'restricted';
          }
          if (deauthorize) {
            response.statusCode = 403;
            response.body = '{ type: "error", message: "Unauthorized" }';
          }
        }
        resolve(response);
      });
    });
  }

  passthru(res) {
    this.performPassthru().then(response => {
      res.status(response.statusCode)
        .set(response.headers)
        .postProcess();
      res.send(new Buffer(response.body));
    })
  }
}

module.exports = ESProxy;
const request = require('request');
const jwt = require('jsonwebtoken');
const url = require('url');

function user() {
  return (req, res, next) => {
    let token = req.get(req.app.get('api-token-header'));
    let secret = req.app.get('api-token-secret');
    if (token != null) {
      try {
        req.user = jwt.verify(token, secret);
      } catch {
        req.user = null;
      }
    } else {
      req.user = null;
    }
    next();
  }
}

function parseOpenAMAttributes(body) {
  let attrs = body.trim().split(/\n/);
  let result = {};
  let attributeName = '';
  attrs.forEach((attr) => {
    let statement = attr.split(/=/);
    let statementType = statement[0].split(/\./).pop();
    switch (statementType) {
      case 'name':
        attributeName = statement[1];
        break;
      case 'value':
        if (result.hasOwnProperty(attributeName)) {
          if (typeof result[attributeName] == 'string') {
            result[attributeName] = [result[attributeName]];
          }
          result[attributeName].push(statement[1]);
        } else {
          result[attributeName] = statement[1];
        }
        break;
      default:
    }
  });
  return result;
}

async function redeemSsoToken(req) {
  let ssoToken = req.cookies[req.app.get('openam-cookie')];
  return new Promise((resolve, reject) => {
    if (ssoToken != null) {
      request.post(
        {
          url: url.resolve(req.app.get('openam-server'), 'identity/attributes'),
          form: { subjectid: ssoToken }
        },
        (err, proxyResponse, proxyResponseBody) => {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            resolve(parseOpenAMAttributes(proxyResponseBody));
          }
        }
      )
    } else {
      resolve(null);
    }
  })
}

function token(user, secret) {
  return jwt.sign(user, secret);
}

module.exports = {
  user: user,
  redeemSsoToken: redeemSsoToken,
  token: token
}

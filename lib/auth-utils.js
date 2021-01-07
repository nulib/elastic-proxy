const request = require("request");
const jwt = require("jsonwebtoken");
const url = require("url");
const axios = require("axios");

function isEmpty(val) {
  return val === null || val === undefined || val === "";
}

function extractToken(req) {
  return req.get(req.app.get("api-token-header"));
}

function extractAuthHeader(req) {
  let authHeader = req.get("Authorization");
  if (!isEmpty(authHeader) && authHeader.match(/^Bearer /)) {
    return authHeader.replace(/^Bearer /, "");
  }
  return null;
}

function extractApiCookie(req) {
  return req.cookies[req.app.get("api-token-cookie")];
}

function user() {
  return (req, res, next) => {
    let token = extractToken(req) || extractAuthHeader(req) || extractApiCookie(req);
    let secret = req.app.get("api-token-secret");
    if (token != null) {
      try {
        req.user = jwt.verify(token, secret);
      } catch (err) {
        req.user = null;
      }
    } else {
      req.user = null;
    }
    next();
  };
}

async function redeemSsoToken(req) {
  console.log("redeemSsoToken");
  let nussoToken =
    req.get(req.app.get("nusso-cookie-header")) ||
    req.cookies[req.app.get("nusso-cookie")];
  return new Promise((resolve, reject) => {
    if (nussoToken != null) {
      axios
        .get(
          `${req.app.get(
            "nusso-base-url"
          )}validate-with-directory-search-response`,
          {
            headers: {
              apikey: req.app.get("nusso-api-key"),
              webssotoken: nussoToken,
            },
          }
        )
        .then(function (response) {
          console.log("results", response.data.results[0]);
          resolve(response.data.results[0]);
        })
        .catch(function (error) {
          console.log(error);
        });
    } else {
      resolve(null);
    }
  });
}

function token(user, secret) {
  return jwt.sign(user, secret);
}

module.exports = {
  user: user,
  redeemSsoToken: redeemSsoToken,
  token: token,
};

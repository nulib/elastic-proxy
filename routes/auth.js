const authUtils = require("../lib/auth-utils");
const express = require("express");
const http = require("http");
const router = express.Router();
const url = require("url");
const axios = require("axios");

router.options(/.+/, (req, res, next) => {
  res.postProcess();
  next();
});

router.get("/login", (req, res, next) => {
  let callbackUrl =
    req.protocol + "://" + req.get("host") + req.baseUrl + "/callback";
  res.cookie(res.app.get("nusso-redirect-url"), req.headers.referer);

  axios
    .get(`${req.app.get("nusso-base-url")}get-ldap-redirect-url`, {
      headers: {
        apikey: req.app.get("nusso-api-key"),
        goto: callbackUrl,
      },
    })
    .then(function (response) {
      res.postProcess().redirect(response.data.redirecturl);
    })
    .catch(function (error) {
      console.log(error);
    });
});

router.get("/callback", (req, res, next) => {
  console.log("callback");
  authUtils
    .redeemSsoToken(req)
    .then((user) => {
      if (user == null) {
        res.clearCookie(res.app.get("api-token-cookie"));
        res.clearCookie(res.app.get("api-token-user"));
        res.postProcess().send({ token: null });
      } else {
        console.log(`${user.mail} successfully authenticated`);
        let jwtToken = authUtils.token(user, req.app.get("api-token-secret"));
        res.cookie(res.app.get("api-token-cookie"), jwtToken, {
          domain: res.app.get("auth-domain"),
        });
        res.cookie(res.app.get("api-token-user"), user.mail, {
          domain: res.app.get("auth-domain"),
        });
        let redirectUrl = req.cookies[req.app.get("nusso-redirect-url")];
        res.clearCookie(res.app.get("nusso-redirect-url"));
        res.postProcess().redirect(redirectUrl);
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

router.get("/whoami", (req, res, next) => {
  res.postProcess().send(req.user);
});

module.exports = router;

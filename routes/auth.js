const authUtils = require('../lib/auth-utils')
const express = require('express');
const http = require('http');
const router = express.Router();
const url = require('url');

router.options(/.+/, (req, res, next) => {
  res.postProcess();
  next();
})

router.get('/login', (req, res, next) => {
  let server = req.app.get('openam-server');
  let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  let returnUrl = url.resolve(fullUrl, '/auth/callback');
  res.postProcess().redirect(url.resolve(server, 'UI/Login?goto=' + returnUrl));
});

router.get('/callback', (req, res, next) => {
  authUtils.redeemSsoToken(req)
    .then((user) => {
      if (user == null) {
        res.postProcess().send({ token: null })
      } else {
        let jwtToken = authUtils.token(user, req.app.get('api-token-secret'));
        res.postProcess().send({ token: jwtToken });
      }
    })
    .catch((err) => { console.log(err) })
});

router.get('/whoami', (req, res, next) => {
  res.postProcess().send(req.user);
});

module.exports = router;

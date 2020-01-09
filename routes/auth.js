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
  let redirect = url.parse(url.resolve(req.app.get('openam-server'), 'UI/Login'), true);
  let current  = req.protocol + '://' + req.get('host') + req.originalUrl;
  redirect.query.goto = req.query.goto || req.get('Referer');

  res.postProcess().redirect(url.format(redirect));
});

router.get('/callback', (req, res, next) => {
  authUtils.redeemSsoToken(req)
    .then((user) => {
      console.log(`${user.uid} successfully authenticated`)
      if (user == null) {
        res.clearCookie(res.app.get('api-token-cookie'));
        res.postProcess().send({ token: null })
      } else {
        let jwtToken = authUtils.token(user, req.app.get('api-token-secret'));
        res.cookie(res.app.get('api-token-cookie'), jwtToken, { domain: res.app.get('auth-domain') });
        res.postProcess().send({ token: jwtToken, user: user });
      }
    })
    .catch((err) => { console.log(err) })
});

router.get('/whoami', (req, res, next) => {
  res.postProcess().send(req.user);
});

module.exports = router;

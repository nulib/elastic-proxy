const ESProxy = require('../lib/es-proxy');
const express = require('express');
const router  = express.Router();

function explain(req, res, _next) {
  let proxy = new ESProxy(req);
  res.set('Content-Type', 'application/json');
  res.postProcess();
  res.send(proxy.wrapQuery(req.body).map(q => JSON.stringify(q)).join("\n"));
}

function options(_req, res, _next) {
  res.set('Content-Type', 'application/json');
  res.postProcess();
  res.send();
}

router.get('/*', explain);
router.post('/*', explain);
router.head('/*', explain);
router.options('/*', options);

module.exports = router;
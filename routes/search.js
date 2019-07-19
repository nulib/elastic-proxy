const ESProxy = require('../lib/es-proxy');
const express = require('express');
const router  = express.Router();

function passthru(req, res, _next) {
  let proxy = new ESProxy(req);
  proxy.passthru(res);
}

function ping(req, res, _next) {
  res.set('Content-Type', 'application/json');
  res.postProcess();
  if (req.method !== 'OPTIONS') {
    res.send('{"ping":"OK"}');
  }
  res.send();
}

router.get('/', ping);
router.head('/', ping);
router.options('/', ping);

router.head('/*', passthru);
router.options('/*', passthru);

router.get('/_search/scroll', passthru);
router.post('/_search/scroll', passthru);

router.get('/:index/_all/:id', passthru);
router.post('/:index/_all/:id', passthru);

router.get('/:index/_m?search', passthru);
router.post('/:index/_m?search', passthru);

module.exports = router;

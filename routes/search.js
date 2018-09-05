const ESProxy = require('../lib/es-proxy');
const express = require('express');
const router  = express.Router();

function passthru(req, res, next) {
  let proxy = new ESProxy(req);
  proxy.passthru(res);
}

router.head('/*', passthru);
router.options('/*', passthru);

router.get('/:index/_all/:id', passthru);

router.get('/:index/_m?search', passthru);
router.post('/:index/_m?search', passthru);

module.exports = router;

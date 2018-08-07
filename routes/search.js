const ESProxy = require('../lib/es-proxy');
const express = require('express');
const router  = express.Router();

function passthru(req, res, next) {
  let proxy = new ESProxy(req);
  proxy.passthru(res);
}

router.options('/:index/_m?search', passthru);
router.get('/:index/_m?search', passthru);
router.post('/:index/_m?search', passthru);

module.exports = router;

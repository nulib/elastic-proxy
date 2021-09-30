const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  res.postProcess().send({ response: 'OK', at: new Date().toISOString() });
});

module.exports = router;
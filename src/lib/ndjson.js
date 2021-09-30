module.exports = {
  ndjson: () => {
    return (req, res, next) => {
      if (req.is('application/json')) {
        req.body = [req.body];
      } else if (req.is('application/x-ndjson')) {
        req.body = req.body.trim().split(/\n/).map(jsonDoc => JSON.parse(jsonDoc.trim()));
      }
      next();
    }
  }
}

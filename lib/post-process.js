module.exports = () => {
  return (req, res, next) => {
    res.postProcess = () => {
      let acah = res.get('Access-Control-Allow-Headers') || "";
      let headers = acah.split(/\s*,\s*/).filter(h => h.length > 0);
      headers.push('Authorization');
      headers.push(res.app.get('api-token-header'));
      headers.push(res.app.get('openam-cookie-header'));
      let addHeaders = {
        'Access-Control-Allow-Headers': Array.from(new Set(headers)).join(', '),
        'Access-Control-Allow-Credentials': 'true'
      }
      if (req.get('Origin') != null) {
        addHeaders['Access-Control-Allow-Origin'] = req.get('Origin')
      }
      res.set(addHeaders);
      return res;
    }
    next();
  }
}

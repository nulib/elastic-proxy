require('dotenv').config();

const authUtils    = require('./lib/auth-utils')
const bodyParser   = require('body-parser');
const createError  = require('http-errors');
const express      = require('express');
const honeybadger  = require('honeybadger');
const ndjson       = require('./lib/ndjson');
const path         = require('path');
const cookieParser = require('cookie-parser');
const logger       = require('morgan');
const postProcess  = require('./lib/post-process');

const authRouter   = require('./routes/auth');
const searchRouter = require('./routes/search');
const statusRouter = require('./routes/status');
const app = express();

honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY,
  environment: process.env.HONEYBADGER_ENV
});

app.set('upstream', process.env.UPSTREAM || 'http://localhost:9200/');
app.set('api-token-cookie', process.env.API_TOKEN_COOKIE || 'dcApiToken')
app.set('api-token-header', process.env.API_TOKEN_HEADER || 'X-API-Token');
app.set('api-token-secret', process.env.API_TOKEN_SECRET);
app.set('auth-domain', process.env.AUTH_DOMAIN || '.library.northwestern.edu');
app.set('openam-server', process.env.OPENAM_SERVER || 'https://websso.it.northwestern.edu/amserver/');
app.set('openam-cookie', process.env.OPENAM_COOKIE || 'openAMssoToken');
app.set('openam-cookie-header', process.env.OPENAM_COOKIE_HEADER || 'X-OpenAM-SSO-Token');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.text({type: 'application/x-ndjson'}));
app.use(ndjson.ndjson());
app.use(cookieParser());
app.use(authUtils.user());
app.use(postProcess());

app.use('/auth', authRouter);
app.use('/search', searchRouter);
app.use('/status', statusRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next){
    console.log(err);
    res.status(err.status || 500);
    res.send({
        message: err.message,
        error: err
    });
   return;
});

module.exports = app;

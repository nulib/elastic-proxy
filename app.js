require('dotenv').config();

const authUtils    = require('./lib/auth-utils')
const bodyParser   = require('body-parser');
const createError  = require('http-errors');
const express      = require('express');
const ndjson       = require('./lib/ndjson');
const path         = require('path');
const cookieParser = require('cookie-parser');
const logger       = require('morgan');
const postProcess  = require('./lib/post-process');

const authRouter   = require('./routes/auth');
const searchRouter = require('./routes/search');

const app = express();

app.set('upstream', process.env.UPSTREAM);
app.set('api-token-header', process.env.API_TOKEN_HEADER);
app.set('api-token-secret', process.env.API_TOKEN_SECRET);
app.set('openam-server', process.env.OPENAM_SERVER);
app.set('openam-cookie', process.env.OPENAM_COOKIE);

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.text({type: 'application/x-ndjson'}));
app.use(ndjson.ndjson());
app.use(cookieParser());
app.use(authUtils.user());
app.use(postProcess());

app.use('/auth', authRouter);
app.use('/search', searchRouter);

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

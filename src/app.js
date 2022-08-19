require("dotenv").config();

const authUtils = require("./lib/auth-utils");
const bodyParser = require("body-parser");
const createError = require("http-errors");
const express = require("express");
const honeybadger = require("honeybadger");
const ndjson = require("./lib/ndjson");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const postProcess = require("./lib/post-process");

const authRouter = require("./routes/auth");
const explainRouter = require("./routes/explain");
const resolveRouter = require("./routes/resolve");
const searchRouter = require("./routes/search");
const statusRouter = require("./routes/status");
const app = express();

honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY,
  environment: process.env.HONEYBADGER_ENV,
});

app.set("upstream", process.env.UPSTREAM || "http://localhost:9200/");
app.set("api-token-cookie", process.env.API_TOKEN_COOKIE || "dcApiToken");
app.set("api-token-header", process.env.API_TOKEN_HEADER || "X-API-Token");
app.set("api-token-secret", process.env.API_TOKEN_SECRET);
app.set("api-token-user", process.env.API_TOKEN_USER || "dcApiUser");
app.set("auth-domain", process.env.AUTH_DOMAIN || ".library.northwestern.edu");
app.set(
  "openam-server",
  process.env.OPENAM_SERVER || "https://websso.it.northwestern.edu/amserver/"
);
app.set("openam-cookie", process.env.OPENAM_COOKIE || "openAMssoToken");
app.set(
  "openam-cookie-header",
  process.env.OPENAM_COOKIE_HEADER || "X-OpenAM-SSO-Token"
);
app.set(
  "nusso-base-url",
  process.env.NUSSO_BASE_URL ||
    "https://northwestern-prod.apigee.net/agentless-websso/"
);
app.set("nusso-api-key", process.env.NUSSO_API_KEY);
app.set("nusso-cookie", process.env.NUSSO_COOKIE || "nusso");
app.set(
  "nusso-cookie-header",
  process.env.NUSSO_COOKIE_HEADER || "X-NUSSO-Token"
);
app.set(
  "nusso-redirect-url",
  process.env.NUSSO_REDIRECT_URL || "nussoRedirectUrl"
);
app.set("reading-room-ips", process.env.READING_ROOM_IPS?.split(/\s*,\s*/) || [])

app.use(logger(process.env.LOGGING_MODE || "short"));
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.text({ limit: "5mb", type: "application/x-ndjson" }));
app.use(ndjson.ndjson());
app.use(cookieParser());
app.use(authUtils.user());
app.use(postProcess());

app.use(function (req, _res, next) {
  req.url = req.url.replace(/^\/api\/v1/, '');
  next();
});

app.use("/auth", authRouter);
app.use("/explain", explainRouter);
app.use("/resolve", resolveRouter);
app.use("/search", searchRouter);
app.use("/status", statusRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  console.log(err);
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: err,
  });
  return;
});

module.exports = app;

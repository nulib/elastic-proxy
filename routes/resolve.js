const { awsFetch, makeRequest } = require("../lib/aws-utils");
const express = require("express");
const router = express.Router();
const url = require("url");

async function getDocForLink(req, res, _next) {
  try {
    const sharedLink = await lookupSharedLink(req);
    if (!validateSharedLink(sharedLink)) {
      res.status(404);
      res.send("Not Found");
      return true;
    }

    const doc = await lookupTargetDoc(req, sharedLink);
    res.set("Content-Type", "application/json");
    res.status(200);
    res.postProcess();
    res.send(doc);
  } catch(error) {
    console.error("ERROR: ", error)
    throw error;
  }
}

function validateSharedLink(sharedLink) {
  if (!sharedLink.found) {
    console.log("Link not found");
    return false;
  }

  const expiration = new Date(sharedLink._source.expires)
  if (expiration <= new Date()) {
    console.log("Link expired");
    return false;
  }

  return true;
}

async function lookupSharedLink(req) {
  const linkId = req.params.linkId;
  const requestUrl = url.resolve(
    req.app.get("upstream"),
    `/shared_links/_doc/${linkId}`
  );
  return JSON.parse(await fetchResult(requestUrl));
}

async function lookupTargetDoc(req, sharedLink) {
  const docId = sharedLink._source.work_id;
  const requestUrl = url.resolve(
    req.app.get("upstream"),
    `/meadow/_doc/${docId}`
  );
  return await fetchResult(requestUrl);
}

async function fetchResult(requestUrl) {
  const request = await makeRequest("GET", requestUrl);
  const response = await awsFetch(request);
  const body = await fetchBody(response);
  return body;
}

function fetchBody(response) {
  return new Promise((resolve, reject) => {
    let responseBody = "";
    response.on("data", (chunk) => responseBody += chunk);
    response.on("end", () => resolve(responseBody));
    response.on("error", (error) => reject(error));
  });
}

function options(_req, res, _next) {
  res.set("Content-Type", "application/json");
  res.postProcess();
  res.send();
}

router.get("/:linkId", getDocForLink);
router.post("/:linkId", getDocForLink);
router.head("/:linkId", getDocForLink);
router.options("/:linkId", options);

module.exports = router;

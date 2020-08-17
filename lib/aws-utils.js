const AWS = require("aws-sdk");
const urlParse = require("url");
const util = require("util");

async function awsFetch(request) {
  return new Promise((resolve, reject) => {
    var client = new AWS.HttpClient();
    client.handleRequest(
      request,
      null,
      (response) => resolve(response),
      (error) => reject(error)
    );
  });
}

async function makeRequest(method, url, headers, body) {
  headers = headers || {};
  body = body || "";

  let chain = new AWS.CredentialProviderChain();
  let request = new AWS.HttpRequest(url, "us-east-1");
  request.method = method;
  request.headers["Host"] = urlParse.parse(url).host;
  request.headers["Content-Length"] = new util.TextEncoder().encode(
    body
  ).length;
  request.body = body;
  for (var header in headers) {
    request.headers[header] = header[header];
  }

  let credentials = await resolveCredentials();
  let signer = new AWS.Signers.V4(request, "es");
  signer.addAuthorization(credentials, new Date());
  return request;
}

function resolveCredentials() {
  let chain = new AWS.CredentialProviderChain();
  return new Promise((resolve, reject) => {
    chain.resolve((error, credentials) => {
      if (error) {
        reject(error);
      } else {
        resolve(credentials);
      }
    });
  });
}

module.exports = { awsFetch, makeRequest };

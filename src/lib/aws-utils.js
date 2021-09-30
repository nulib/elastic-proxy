const AWS = require("aws-sdk");
const urlParse = require("url");
const util = require("util");

const awsFetch = (request) => {
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

const makeRequest = async (method, url, headers, body) => {
  headers = headers || {};
  body = body || "";

  let request = new AWS.HttpRequest(url, "us-east-1");
  request.method = method;
  request.headers = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Content-Length": new util.TextEncoder().encode(body).length,
    "Host": urlParse.parse(url).host,
    "User-Agent": "nul-dc-api/1.0.0",
    ...headers
  };
  request.body = body;

  let credentials = await resolveCredentials();
  let signer = new AWS.Signers.V4(request, "es");
  signer.addAuthorization(credentials, new Date());
  return request;
}

const resolveCredentials = () => {
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

const chai = require("chai");
const chaiHttp = require("chai-http");
const expect = chai.expect;
chai.use(chaiHttp);
const jwt = require("jsonwebtoken");
const server = "http://localhost:3334/";
const query = {
  query: {
    bool: {
      must: [{ bool: { must: [{ match: { "model.name": "Image" } }] } }],
    },
  },
};

const extractVisibilities = (res) => {
  return res.body.hits.hits.map((doc) => {
    const result = doc._source.visibility.id || doc._source.visibility;
    return result.toLowerCase();
  });
};

const extractPublished = (res) => {
  return res.body.hits.hits.map((doc) => doc._source.published);
};

const token = jwt.sign("testuser@northwestern.edu", "test-secret");

describe("Search", () => {
  describe("GET /search", function () {
    describe("anonymous", () => {
      ["scalar", "object"].map((visibility) => {
        it(`should retrieve an open_empty document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_open_empty`
            )
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              done();
            });
        });

        it(`should retrieve an open_published document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_open_published`
            )
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              done();
            });
        });

        it(`should not retrieve an open_unpublished document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_open_unpublished`
            )
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });

        it(`should not retrieve an authenticated_empty document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_authenticated_empty`
            )
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });

        it(`should not retrieve an authenticated_published document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_authenticated_published`
            )
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });

        it(`should not retrieve an authenticated_unpublished document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_authenticated_unpublished`
            )
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });

        it(`should not retrieve a restricted_empty document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_restricted_empty`
            )
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });

        it(`should not retrieve a restricted_published document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_restricted_published`
            )
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });

        it(`should not retrieve a restricted_unpublished document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_restricted_unpublished`
            )
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });
      });
    });

    describe("logged in", () => {
      ["scalar", "object"].map((visibility) => {
        it(`should retrieve an open_empty document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_open_empty`
            )
            .set("X-API-Token", token)
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              done();
            });
        });

        it(`should retrieve an open_published document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_open_published`
            )
            .set("X-API-Token", token)
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              done();
            });
        });

        it(`should not retrieve an open_unpublished document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_open_unpublished`
            )
            .set("X-API-Token", token)
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });

        it(`should retrieve an authenticated_empty document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_authenticated_empty`
            )
            .set("X-API-Token", token)
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              done();
            });
        });

        it(`should retrieve an authenticated_published document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_authenticated_published`
            )
            .set("X-API-Token", token)
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              done();
            });
        });

        it(`should not retrieve an authenticated_unpublished document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_authenticated_unpublished`
            )
            .set("X-API-Token", token)
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });

        it(`should not retrieve a restricted_empty document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_restricted_empty`
            )
            .set("X-API-Token", token)
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });

        it(`should not retrieve a restricted_published document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_restricted_published`
            )
            .set("X-API-Token", token)
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });

        it(`should not retrieve a restricted_unpublished document with ${visibility} visibility`, (done) => {
          chai
            .request(server)
            .get(
              `search/${visibility}_visibility/_doc/${visibility}_restricted_unpublished`
            )
            .set("X-API-Token", token)
            .end((err, _res) => {
              expect(err.statusCode).to.equal(403);
              done();
            });
        });
      });
    });
  });

  describe("POST /search", () => {
    describe("anonymous", () => {
      it("should only include public results", (done) => {
        chai
          .request(server)
          .post("search/scalar_visibility,object_visibility/_search")
          .set("Content-Type", "application/json")
          .send(query)
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body.hits.total.value).to.equal(4);
            let visibilities = extractVisibilities(res);
            expect(visibilities).to.include("open");
            expect(visibilities).not.to.include("authenticated");
            expect(visibilities).not.to.include("restricted");
            let published = extractPublished(res);
            expect(published).to.include(undefined);
            expect(published).to.include(true);
            expect(published).not.to.include(false);
            done();
          });
      });
    });

    describe("logged in", () => {
      it("should return public and authenticated results", (done) => {
        chai
          .request(server)
          .post("search/scalar_visibility,object_visibility/_search")
          .set("Content-Type", "application/json")
          .set("X-API-Token", token)
          .send(query)
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body.hits.total.value).to.equal(8);
            let visibilities = extractVisibilities(res);
            expect(visibilities).to.include("open");
            expect(visibilities).to.include("authenticated");
            expect(visibilities).not.to.include("restricted");
            let published = extractPublished(res);
            expect(published).to.include(undefined);
            expect(published).to.include(true);
            expect(published).not.to.include(false);
            done();
          });
      });
    });
  });
});

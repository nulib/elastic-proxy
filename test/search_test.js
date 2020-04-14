const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
chai.use(chaiHttp);
const jwt = require('jsonwebtoken');
const app = require('../app');
const server = 'http://localhost:3334/'
const query = {
  query:{bool:{must:[{bool:{must:[{match:{"model.name":"Image"}}]}}]}},
  size:0,
  aggs:{"visibility.keyword":{terms:{field:"visibility.keyword",size:250,order:{_count:"desc"},missing:"None"}}}
}

describe('Search', function () {

  describe('POST /search', function () {
    let extractKeywords = (res) => {
      return res
              .body
              .aggregations['visibility.keyword']
              .buckets
              .map(({key, _}) => { return key });
    }

    describe('anonymous', function () {
      it('should only include public results', function (done) {
        chai.request(server)
          .post('search/common/_search')
          .set("Content-Type", "application/json")
          .send(query)
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            let keywords = extractKeywords(res);
            expect(keywords).to.include('open');
            expect(keywords).not.to.include('authenticated');
            expect(keywords).not.to.include('restricted');
            done();
          })
      })
    })

    describe('logged in', function () {
      it('should public and authenticated results', function (done) {
        let token = jwt.sign('testuser@northwestern.edu', process.env.API_TOKEN_SECRET)
        chai.request(server)
          .post('search/common/_search')
          .set("Content-Type", "application/json")
          .set('X-API-Token', token)
          .send(query)
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            let keywords = extractKeywords(res);
            expect(keywords).to.include('open');
            expect(keywords).to.include('authenticated');
            expect(keywords).not.to.include('restricted');
            done();
          })
      })
    })
  })
})

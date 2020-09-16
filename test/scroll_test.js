const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
chai.use(chaiHttp);
const jwt = require('jsonwebtoken');
const server = 'http://localhost:3334/'
const query = {query:{bool:{must:[{bool:{must:[{match:{"model.name":"Image"}}]}}]}}}

const token = jwt.sign('testuser@northwestern.edu', process.env.API_TOKEN_SECRET)

describe('Scroll', () => {
  it('should allow scrolling', done => {
    chai.request(server)
      .post('search/scalar_visibility,object_visibility/_search?scroll=1m')
      .set("Content-Type", "application/json")
      .send(query)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        let scrollId = res.body._scroll_id;
        chai.request(server)
          .post('search/_search/scroll')
          .set("Content-Type", "application/json")
          .send({scroll: '1m', scroll_id: scrollId})
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            done();
          });
      });
  });
});
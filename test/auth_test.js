const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
chai.use(chaiHttp);
const jwt = require('jsonwebtoken');
const app = require('../app');
const server = 'http://localhost:3334/'

describe('Auth', function () {
  describe('GET /auth/whoami', function () {
    describe('anonymous', function () {
      it('should return an empty object', function (done) {
        chai.request(server)
          .get('auth/whoami')
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.be.eql('');
            done();
          })
      })
    });

    describe('logged in', () => {
      let token = jwt.sign('testuser@northwestern.edu', process.env.API_TOKEN_SECRET)
      it('API Token', function (done) {
        chai.request(server)
          .get('auth/whoami')
          .set('X-API-Token', token)
          .send()
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.be.eql('testuser@northwestern.edu');
            done();
          })
      })

      it('Auth Header', (done) => {
        chai.request(server)
          .get('auth/whoami')
          .set('Authorization', `Bearer ${token}`)
          .send()
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.be.eql('testuser@northwestern.edu');
            done();
          })
      })

      it('Cookie', (done) => {
        chai.request(server)
          .get('auth/whoami')
          .set('Cookie', `dcApiToken=${token}`)
          .send()
          .end(function (err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.text).to.be.eql('testuser@northwestern.edu');
            done();
          })
      })
    })
  })
})

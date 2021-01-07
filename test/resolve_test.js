const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
chai.use(chaiHttp);
const server = 'http://localhost:3334/'

describe('Resolve', ()  => {
  describe('GET /resolve', ()  => {
    ["open", "authenticated", "restricted"].map((visibility) => {
      ["empty", "published", "unpublished"].map((published) => {
        it(`should resolve a valid ${visibility} ${published} link`, done => {
          chai.request(server)
            .get(`resolve/link_to_${visibility}_${published}`)
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              expect(res.body._source.model.name).to.equal("Image");
              done();
            });    
        });    
      });
    });

    it('should not resolve a link with a bad target', done => {
      chai.request(server)
        .get('resolve/bad_link')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(404);
          done();
        });
    });

    it("should not resolve a link that doesn't exist", done => {
      chai.request(server)
        .get('resolve/nonexistent_link')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(404);
          done();
        });
    });

    it('should not resolve an expired link', done => {
      chai.request(server)
        .get('resolve/expired_link')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(404);
          done();
        });
    });
  });
});
const
  chai = require('chai'),
  request = require('supertest'),
  expect = chai.expect,
  assert = chai.assert;

const app = require('../lib/api').app;

describe('Search', () => {

  const agent = request.agent(app);

  describe('GET /api/search', () => {
    it('responds with status 404', done => {
      agent.get('/api/search').expect(404).end((error, response) => {
        assert(!error);
        expect(response.body).to.deep.equal({
          errors: [{
              title: 'Not Found',
              detail: {
                status: 404
              }
            }]
        });
        done();
      });
    });
  });
});
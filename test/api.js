const
  chai = require('chai'),
  request = require('supertest'),
  assert = chai.assert,
  expect = chai.expect,
  config = require('../lib/config'),
  {app, db} = require('../lib/api'),
  records = require('./records');

describe('API', () => {

  const agent = request.agent(app);

  before(done => {
    let total = config.schema.length;
    config.schema.forEach(sql => {
      db.raw(sql).then(() => {
        total -= 1;
        if (!total) {
          let dataTotal = records.length;
          records.forEach(record => {
            db('earthquake').insert(record).then(() => {
              dataTotal -= 1;
              if (!dataTotal) {
                done();
              }
            });
          });
        }
      });
    });
  });

  describe('GET /api/earthquake', () => {
    it('responds with status 200', done => {
      agent.get('/api/earthquake').expect(200).end((error, response) => {
        let results = [];
        response.body.forEach((record) => {
          delete record.id;
          delete record.created;
          results.push(record);
        });
        expect(results).to.deep.equal(records);
        assert(!error);
        done();
      });
    });
  });

});
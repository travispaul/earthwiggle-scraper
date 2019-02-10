const
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  {
    fetchHEAD
  } = require('../lib/scrape');

describe('Scrape data', () => {

  // before(done => {
  //     const db = new sqlite3.Database(dbpath);
  //     db.serialize(() => {
  //         db.run("INSERT INTO songlists (id, listType, bandId, name) VALUES (1, 'recording', '2', 'Season 1')");
  //     });
  //     db.close(() => {
  //         host = `http://${process.env.TESTHOST}`;
  //         agent
  //             .post('/auth/login')
  //             .send({
  //                 username: 'Mr.Susan',
  //                 password: 'lookadthemshine'
  //             })
  //             .expect(200, done)
  //     });
  // });

  describe('fetchHEAD', () => {
    it('responds with status 201', done => {
      fetchHEAD({}, done);
      expect();
      assert();
    });
  });
});
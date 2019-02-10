const
  fs = require('fs'),
  path = require('path'),
  nock = require('nock'),
  chai = require('chai'),
  assert = chai.assert,
  {
    setupConfig,
    fetchHEAD,
    fetchBody,
    parseBody,
    checkSchema,
    loadSchema,
    insertRecords,
    saveETag,
    db
  } = require('../lib/scrape'),
  config = require('../lib/config');

let body = fs.readFileSync(path.join(__dirname, 'body.html'), 'utf8').toString();

describe('Scrape data', () => {

  before(done => {
    setupConfig();
    done();
  });

  describe('fetchHEAD', () => {

    it('Calls next() if no ETag is present', done => {
      fetchHEAD({
        etag: false
      }, (error, context) => {
        if (error) {
          console.error(error);
          assert(!error, 'Error in HTTP request');
        }
        assert(!context.body, 'fetchHEAD made a full HTTP request');
        done();
      });
    });

    it('Exists gracefully if ETag has not changed', done => {
      const
        scope = nock(`${config.proto}${config.type}.${config.domain}`)
          .head('/')
          .reply(200, null, {etag: 'xxx'});

      fetchHEAD({
        etag: 'xxx'
      }, (error) => {
        assert(error.graceful, 'fetchHEAD did not exit gracefully when ETags are identical');
        scope.done();
        done();
      });
    });

    it('Calls next() if ETag is different', done => {
      const
        scope = nock(`${config.proto}${config.type}.${config.domain}`)
          .head('/')
          .reply(200, null, {etag: 'zzz'});

      fetchHEAD({
        etag: 'yyy'
      }, (error, context) => {
        assert(context.etag === 'zzz', 'fetchHEAD did not update ETag');
        scope.done();
        done();
      });
    });

  });

  describe('fetchBody', () => {
    it('Fetches the html body', done => {
      const
        scope = nock(`${config.proto}${config.type}.${config.domain}`)
          .get('/')
          .reply(200, body);

      fetchBody({}, (error, context) => {
        if (error) {
          console.error(error);
          assert(!error, 'Error in HTTP request');
        }
        assert(context.body, 'fetchBody did not return a body');
        scope.done();
        done();
      });
    });
  });

  describe('parseBody', () => {
    it('Parses the body into records', done => {
      parseBody({
        body: body
      }, (error, context) => {
        if (error) {
          console.error(error);
          assert(!error, 'Error while parsing body');
        }
        assert(context.records.length, 'parseBody did not create records');
        done();
      });
    });
  });

  describe('loadSchema', () => {
    it('Finds missing schema', done => {
      checkSchema({}, (error, context) => {
        if (error) {
          console.error(error);
          assert(!error, 'Error while checking for schema');
        }
        assert(context.createTables, 'checkSchema did not detect missing schema');
        done();
      });
    });

    it('Loads schema', done => {
      loadSchema({createTables: true}, (error) => {
        if (error) {
          console.error(error);
          assert(!error, 'Error while loading schema');
        }
        checkSchema({}, (error, context) => {
          assert(!context.createTables, 'loadSchema did not create schema');
          done();
        });
      });
    });
  });

  describe('insertRecords', () => {
    const records = [
      { link: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0321_B1.html',
        img: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0321_B1.jpg',
        event: '10 February 2019 - 11:21 AM',
        latitude: '07.58',
        longitude: '126.74',
        depth: '045',
        magnitude: '2.8',
        location: '020 km N 90° E of Baganga (Davao Oriental)'
      },
      {
        link: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0306_B1F.html',
        img: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0306_B1F.jpg',
        event: '10 February 2019 - 11:06 AM',
        latitude: '09.86',
        longitude: '126.57',
        depth: '006',
        magnitude: '4.5',
        location: '047 km N 80° E of General Luna (Surigao Del Norte)'
      },
      {
        link: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0304_B1.html',
        img: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0304_B1.jpg',
        event: '10 February 2019 - 11:04 AM',
        latitude: '09.86',
        longitude: '126.54',
        depth: '012',
        magnitude: '2.9',
        location: '043 km N 78° E of General Luna (Surigao Del Norte)'
      }
    ];

    it('Insert new records', done => {
      insertRecords({records: records}, (error) => {
        if (error) {
          console.error(error);
          assert(!error, 'Error while inserting records');
        }
        db.select('*').from(config.type).then(rows => {
          assert(rows.length === 3);
          done();
        });
      });
    });

    it('Do not insert existing records', done => {
      insertRecords({records: records}, (error) => {
        if (error) {
          console.error(error);
          assert(!error, 'Error while inserting records');
        }
        db.select('*').from(config.type).then(rows => {
          assert(rows.length === 3);
          done();
        });
      });
    });
  });

  describe('saveETag', () => {
    it('Insert a new ETag', done => {
      saveETag({etag: '123'}, (error) => {
        if (error) {
          console.error(error);
          assert(!error, 'Error while inserting ETag');
        }
        db.select('*').from('etag').where({etag: '123'}).then(rows => {
          assert(rows.length === 1);
          done();
        });
      });
    });

    it('Do not reinsert ETag', done => {
      saveETag({etag: '123'}, (error) => {
        if (error) {
          console.error(error);
          assert(!error, 'Error while inserting ETag');
        }
        db.select('*').from('etag').where({etag: '123'}).then(rows => {
          assert(rows.length === 1);
          db.destroy();
          done();
        });
      });
    });
  });

});
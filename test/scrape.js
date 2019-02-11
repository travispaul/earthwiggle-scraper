const
  fs = require('fs'),
  path = require('path'),
  nock = require('nock'),
  chai = require('chai'),
  {DateTime} = require('luxon'),
  assert = chai.assert,
  expect = chai.expect,
  {
    setupConfig,
    fetchHEAD,
    fetchBody,
    parseBody,
    checkSchema,
    loadSchema,
    insertRecords,
    saveETag,
    buildSlackPayload,
    sendSlackNotification,
    db
  } = require('../lib/scrape'),
  config = require('../lib/config'),
  records = [
    { link: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0321_B1.html',
      img: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0321_B1.jpg',
      event: '2019-02-10T11:21:00.000+08:00',
      latitude: '07.58',
      longitude: '126.74',
      depth: '045',
      magnitude: '2.8',
      location: '020 km N 90° E of Baganga (Davao Oriental)'
    },
    {
      link: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0306_B1F.html',
      img: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0306_B1F.jpg',
      event: '2019-02-10T11:06:00.000+08:00',
      latitude: '09.86',
      longitude: '126.57',
      depth: '006',
      magnitude: '4.5',
      location: '047 km N 80° E of General Luna (Surigao Del Norte)'
    },
    {
      link: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0304_B1.html',
      img: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0304_B1.jpg',
      event: '2019-02-10T11:04:00.000+08:00',
      latitude: '09.86',
      longitude: '126.54',
      depth: '012',
      magnitude: '2.9',
      location: '043 km N 78° E of General Luna (Surigao Del Norte)'
    }
  ];

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
    it('Inserts new records', done => {
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

    it('Does not insert existing records', done => {
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
    it('Inserts a new ETag', done => {
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

    it('Does not reinsert ETag', done => {
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

  describe('buildSlackPayload', () => {
    it('Generates accurate payload', done => {
      const expected = {
        text: 'Micro seismic activity detected. Felt slightly by some people. No damage to buildings.',
        channel: '#api-testing',
        username: 'EarthWiggle',
        attachments: [
          {
            fallback: 'Micro seismic activity detected',
            color: '#c5efc0',
            title: ':pushpin: :leaves: Micro seismic activity',
            title_link: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0321_B1.html',
            text: '020 km N 90° E of Baganga (Davao Oriental)',
            fields: [
              {
                title: 'Magnitude',
                value: '2.8',
                short: false
              },
              {
                title: 'Depth',
                value: '045km',
                short: false
              },
              {
                title: ':world_map: Google Maps',
                value: '<https://maps.google.com/?q=07.58,126.74|Location on google maps>',
                short: false
              },
              {
                title: ':chart_with_upwards_trend: More Details',
                value: '<https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0321_B1.html|Phivolcs details>',
                short: false
              }
            ],
            image_url: 'https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/2019_0210_0321_B1.jpg'
          }
        ]
      };
      const payload = buildSlackPayload(records[0]);
      expect(payload).to.deep.equal(expected);
      done();
    });
  });

  describe('sendSlackNotification', () => {
    it('Sends slack notification for new record', done => {
      const
        scope = nock(config.slack.hook)
          .post('')
          .reply(200, 'ok')
          .post('')
          .reply(200, 'ok'),
        context = {
          records: records,
          overrideEpoch: DateTime.fromISO(records[0].event).minus({minutes: 16})
        };
      sendSlackNotification(context, (error, newContext) => {
        assert(!error);
        assert(newContext.sent.length === 2);
        scope.done();
        done();
      });
    });
    it('Does not send slack notification when no records are present', done => {
      const context = {
        records: []
      };
      sendSlackNotification(context, (error, newContext) => {
        assert(!newContext.sent.length);
        done();
      });
    });
    it('Does not send slack notification when all events are older than epoch', done => {
      const context = {
        records: records,
        overrideEpoch: DateTime.fromISO(records[0].event).plus({minutes: 1})
      };
      sendSlackNotification(context, (error, newContext) => {
        assert(newContext.sent.length === 0);
        done();
      });
    });
  });
});
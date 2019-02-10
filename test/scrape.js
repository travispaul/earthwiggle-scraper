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
    parseBody
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

});
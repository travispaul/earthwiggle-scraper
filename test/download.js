const
  fs = require('fs'),
  path = require('path'),
  nock = require('nock'),
  chai = require('chai'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({
    name: 'downloader-test',
    streams: [{
      name: 'downloader-test-stdout',
      stream: process.stdout,
      level: 'debug'
    }]
  }),
  assert = chai.assert,
  {img} = require('../lib/download')(log),
  filename = '2019_0210_0321_B1.jpg',
  fullPath = path.join(__dirname, filename),
  url = `https://earthquake.phivolcs.dost.gov.ph/2019_Earthquake_Information/February/${filename}`;

describe('Download and cache images', () => {

  before(done => {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    done();
  });

  it('Downloads image', function (done) {
    const
      scope = nock(url)
        .get('')
        .replyWithFile(200, fullPath + '.nock');
    img({
      url: url,
      cache: __dirname
    }, (error) => {
      assert(!error);
      assert(fs.existsSync(fullPath));
      scope.done();
      done();
    });
  });

  it('Does not re-download a cached image', function (done) {
    img({
      url: url,
      cache: __dirname
    }, (error) => {
      assert(!error);
      assert(fs.existsSync(fullPath));
      done();
    });
  });

});
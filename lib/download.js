const
  fs = require('fs'),
  path = require('path'),
  config = require('./config'),
  request = require('request'),
  {waterfall} = require('vasync');

let log;

function checkCache (context, next) {
  context.filename = path.basename(context.url);
  fs.access(path.join(context.cache, context.filename), fs.constants.F_OK, (error) => {
    if (error && error.code === 'ENOENT') {
      next(null, context);
    } else if (error) {
      next(error);
    } else {
      next({graceful: true});
    }
  });
}

function downloadImage (context, next) {
  const requestOptions = {
    url: context.url,
    method: 'GET',
    headers: {
      'User-Agent': config.userAgent
    },
    encoding: null,
    agentOptions: {
      ca: config.ca
    },
    timeout: config.timeout
  };
  log.debug('Fetching image: %s', context.url);
  request(requestOptions, (error, response, body) => {
    if (error) {
      // Images are sometimes broken or missing
      log.error('Failed to download: %s', context.url);
      // "keep calm and padayon"
      next({graceful: true});
    } else {
      log.debug('fetched body');
      context.body = body;
      next(null, context);
    }
  });
}

function saveImageToCache (context, next) {
  const fullPath = path.join(context.cache, context.filename);
  log.debug('saving image to %s', fullPath);
  fs.writeFile(fullPath, context.body, {encoding: null}, (error) => {
    if (error) {
      return next(error);
    }
    next(null, context);
  });
}

function img (options, callback) {
  waterfall([
    (next) => next(null, options),
    checkCache,
    downloadImage,
    saveImageToCache
  ], (error) => {
    if (error && error.graceful) {
      return callback();
    }
    callback(error);
  });
}

module.exports = (logger) => {
  log = logger;
  return {
    img
  };
};
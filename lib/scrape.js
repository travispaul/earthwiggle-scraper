const
  fs = require('fs'),
  cheerio = require('cheerio'),
  config = require('./config'),
  request = require('request'),
  {waterfall} = require('vasync'),
  bunyan = require('bunyan'),
  knex = require('knex'),
  db = knex(config.knex);

let log;

function fetch (method, callback) {
  const requestOptions = {
    url: `${config.proto}${config.type}.${config.domain}/`,
    method: method,
    gzip: true,
    headers: {
      'User-Agent': config.userAgent
    },
    agentOptions: {
      // philvolcs does not properly bundle their Intermediate CAs
      // with their server certificate.
      ca: config.ca
    }
  };

  log.trace('%j', requestOptions);

  request(requestOptions, callback);
}

function parseEarthquakePage (context) {
  const $ = cheerio.load(context.body);
  const table = $('table')[1];
  const headers = ['event', 'latitude', 'long', 'longitude', 'magnitude', 'location'];
  let skip = 2;

  context.records = [];

  $(table).find('tbody tr').each((_, tr) => {
    const data = {};
    if (skip) {
      skip -= 1;
      return;
    }

    // TODO: XXX parse event into standardized format using moment.js
    $(tr).find('td').each((index, td) => {
      const
        $td = $(td),
        value = $td.text().trim().replace(/[\n|\t]/g, '').replace('  ', ' ');

      if (index === 0) {
        const path = $td.find('a').attr('href').replace(/\\/g, '/');
        data.link = `${config.proto}${config.type}.${config.domain}/` + path;
        data.img = data.link.replace(/html$/, 'jpg');
      }
      data[headers[index]] = value;
    });

    context.records.push(data);
  });
}

function parseTsunamiPage () {
  console.log('Not implemented');
}

function fetchHEAD (context, next) {
  if (!context.etag) {
    return next(null, context);
  }

  fetch('HEAD', (error, response) => {
    if (error) {
      return next(error);
    }

    if (response.statusCode >= 400) {
      return next (new Error(`Request returned status: ${response.statusCode}`));
    }

    log.trace('Got ETag: %s', response.headers.etag);

    if (context.etag === response.headers.etag) {
      log.trace('ETag unchanged: %s', context.etag);
      return next({graceful: true});
    }

    context.etag = response.headers.etag;

    next(null, context);
  });
}

function fetchBody (context, next) {
  fetch('GET', (error, response, body) => {
    if (error) {
      return next(error);
    }

    if (response.statusCode >= 400) {
      return next(new Error(`Request returned status: ${response.statusCode}`));
    }

    context.body = body;

    next(null, context);
  });
}

function parseBody (context, next) {
  if (config.type === 'earthquake') {
    parseEarthquakePage(context);
  } else {
    parseTsunamiPage(context);
  }
  next(null, context);
}

function setupConfig (options) {

  Object.assign(config, options);

  log = bunyan.createLogger({
    name: 'scraper',
    streams: [{
      level: config.loglevel,
      path: `${config.logpath}/scraper.log`
    }]
  });

  if (!config.quiet) {
    log.addStream({
      name: `scraper-stdout`,
      stream: process.stdout,
      level: config.loglevel
    });
  }

  if (config.dump) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }
}

function checkSchema (context, next) {
  // XXX Only works for SQLite3, will need a different check for another DB engine
  log.trace('Checking schema for %s', config.type);
  db.select('name').from('sqlite_master').where({
    type: 'table',
    name: config.type
  }).then(() => {
    context.createTables = false;
    next(null, context);
  })
  .catch(() => {
    context.createTables = true;
    next(null, context);
  });
}

function loadSchema (context, next) {
  if (!context.createTables) {
    return next(null, context);
  }
  const
    path = `${__dirname}/../etc/schema.${config.knex.client}.sql`,
    sql = fs.readFileSync(path, 'utf-8');

  log.trace('Loading schema from %s into database at %s', path,
    config.knex.connection.filename || config.knex.connection.database);

  db.raw(sql).then(() => {
    next(null, context);
  }).catch(next);
}

function main (subcmd, options) {

  setupConfig(options);

  log.trace(`Starting ${config.type} scraper`);

  waterfall([
    function init (next) {
      next(null, {
        etag: null
      });
    },
    checkSchema,
    loadSchema,
    fetchHEAD,
    fetchBody,
    parseBody
  ], (error) => {

    if (error && error.graceful) {
      return log.trace('Stopping waterfall due to graceful exit request.');
    }

    if (error) {
      log.error(error);
      process.exit(1);
    }
  });
}

module.exports = {
  main,
  setupConfig,
  fetchHEAD,
  fetchBody,
  parseBody,
  checkSchema,
  loadSchema,
  db,
  options: [
    {
      names: ['type', 't'],
      helpArg: 'DATATYPE',
      type: 'string',
      help: 'Which source to scrape: earthquake or tsunami'
    },
    {
      names: ['loglevel', 'l'],
      helpArg: 'LEVEL',
      type: 'string',
      help: 'info, warning, error, debug or trace'
    },
    {
      names: ['logpath', 'p'],
      helpArg: 'PATH',
      type: 'string',
      help: 'Path to log files'
    },
    {
      names: ['quiet', 'q'],
      type: 'bool',
      help: 'Supress output to stdout and only log to file.'
    },
    {
      names: ['dump', 'x'],
      type: 'bool',
      help: 'Dump config data and stop.'
    }
  ],
  help: `Scrape earthquake or tsunami data.
Usage:
    {{name}} {{cmd}}
{{options}}`
};
const
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
  const headers = ['event', 'latitude', 'longitude', 'depth', 'magnitude', 'location'];
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

function insertIfNotExists (record, callback) {
  const where = {
    event: record.event
  };
  db.select('id').from(config.type).where(where).then(rows => {
    if (!rows.length) {
      db(config.type).insert(record).then((result) => {
        callback(null, result.pop());
      }).catch(callback);
    } else {
      callback();
    }
  }).catch(callback);
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
    context.etag = response.headers.etag;

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

function insertRecords (context, next) {
  let total = context.records.length;
  context.records.forEach(record => {
    insertIfNotExists(record, (error) => {
      if (error) {
        return next(error);
      }
      total -= 1;
      if (!total) {
        next(null, context);
      }
    });
  });
}

function saveETag (context, next) {
  const where = {etag: context.etag};
  db.select('*').from('etag').where(where).then(rows => {
    if (!rows.length) {
      db('etag').insert(where).then(() => {
        next(null, context);
      }).catch(next);
    } else {
      log.debug('Duplicate ETag: %s', context.etag);
      next(null, context);
    }
  }).catch(next);
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
  }).then((rows) => {
    if (rows && rows.length) {
      context.createTables = false;
    } else {
      context.createTables = true;
    }
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

  let total = config.schema.length;
  config.schema.forEach(sql => {
    db.raw(sql).then(() => {
      log.trace('Running statement: %s', sql);
      total -= 1;
      if (!total) {
        next(null, context);
      }
    }).catch(next);
  });
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
    parseBody,
    insertRecords,
    saveETag
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
  insertRecords,
  saveETag,
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
const
  config = require('./config'),
  bunyan = require('bunyan'),
  cheerio = require('cheerio'),
  request = require('request'),
  /* jshint ignore:start */
  Slack = require('node-slack'),
  /* jshint ignore:end */
  {DateTime} = require('luxon'),
  {waterfall} = require('vasync'),
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

function buildSlackPayload (record) {
  const
    simpleMagnitude = record.magnitude.split('.')[0],
    magDetails = config.slack.magnitude[simpleMagnitude],
    ts = DateTime.fromISO(record.event).toSeconds();

  let emoji = magDetails.emoji;

  if (record.location.toLowerCase().indexOf(config.slack.escalateOnMatch) !== -1) {
    if (parseInt(simpleMagnitude, 10) >= 3) {
      emoji = `:pushpin: :bangbang: ${emoji}`;
    } else {
      emoji = `:pushpin: ${emoji}`;
    }
  }

  // https://api.slack.com/docs/message-attachments
  return {
      text: `${magDetails.type} seismic activity detected. ${magDetails.impact}`,
      channel: config.slack.channel,
      username: config.slack.username,
      attachments: [{
        fallback: `${magDetails.type} seismic activity detected`,
        color: magDetails.color,
        title: `${emoji} ${magDetails.type} seismic activity`,
        title_link: record.link,
        text: record.location,
        fields: [
          {
            title: 'Magnitude',
            value: record.magnitude,
            short: true
          },
          {
            title: 'Depth',
            value: record.depth + 'km',
            short: true
          },
          {
            title: ':world_map: Google Maps',
            value: `<https://maps.google.com/?q=${record.latitude},${record.longitude}|Location on google maps>`,
            short: false
          },
          {
            title: ':chart_with_upwards_trend: More Details',
            value: `<${record.link}|Phivolcs details>`,
            short: false
          }
        ],
        image_url: record.img,
        ts: ts
      }]
    };
}

// XXX Refactor!
function sendSlackNotification (context, next) {
  context.sent = [];
  if (!context.records.length || !config.slack.hook) {
    return next(null, context);
  }
  let
    oldest = DateTime.local().minus(config.slack.notificationEpoch),
    totalSent = 0;

  if (context.overrideEpoch) {
    oldest = context.overrideEpoch;
  }
  /* jshint ignore:start */
  const slack = new Slack(config.slack.hook);
  for (let i = 0; i < context.records.length; i += 1) {
    if (DateTime.fromISO(context.records[i].event) >= oldest && context.records[i].id) {
      totalSent += 1;
      const payload = buildSlackPayload(context.records[i]);
      slack.send(payload, (error, response) => {
        if (error) {
          log.error(error);
          log.error('Failed to send slack notifaction', error);
          return next(error);
        }
        log.debug('Slack notification sent: %s', response);
        context.sent.push(context.records[i].id);
        if (context.sent.length === totalSent) {
          next(null, context);
        }
      });
    } else {
      log.trace('Event: %s, older than epoch: %s', context.records[i].event, oldest.toISO());
    }
  }
  /* jshint ignore:end */
  if (!totalSent) {
    next(null, context);
  }
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

    $(tr).find('td').each((index, td) => {
      const
        $td = $(td),
        value = $td.text().trim().replace(/[\n|\t]/g, '').replace('  ', ' ');

      if (index === 0) {
        const event = DateTime.fromFormat(value, 'dd LLLL yyyy - hh:mm a', {setZone: 'UTC+8'});
        data[headers[index]] = event.toISO();
        const path = $td.find('a').attr('href').replace(/\\/g, '/');
        data.link = `${config.proto}${config.type}.${config.domain}/` + path;
        data.img = data.link.replace(/html$/, 'jpg');
      } else {
        data[headers[index]] = value;
      }
    });

    context.records.push(data);
  });
}

function parseTsunamiPage () {
  console.error('Not implemented');
}

function insertIfNotExists (record, callback) {
  const where = {
    event: record.event
  };
  db.select('id').from(config.type).where(where).then(rows => {
    if (!rows.length) {
      db(config.type).insert(record).then((result) => {
        log.trace('Inserting new event: %s', record.event);
        record.id = result.pop();
        callback();
      }).catch(callback);
    } else {
      callback();
    }
  }).catch(callback);
}

function fetchHEAD (context, next) {
  if (!context.etag) {
    log.debug('No existing ETag');
    return next(null, context);
  }

  log.debug('Current ETag: %s', context.etag);
  fetch('HEAD', (error, response) => {
    if (error) {
      return next(error);
    }

    if (response.statusCode >= 400) {
      return next (new Error(`Request returned status: ${response.statusCode}`));
    }

    log.debug('Got ETag from server via HEAD: %s', response.headers.etag);

    if (context.etag === response.headers.etag) {
      log.debug('ETag unchanged', context.etag);
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

    log.debug('Got ETag from server via GET: %s', response.headers.etag);
    log.debug('Got Body from server: %d bytes', body.length);

    next(null, context);
  });
}

function parseBody (context, next) {
  if (config.type === 'earthquake') {
    parseEarthquakePage(context);
  } else {
    parseTsunamiPage(context);
  }
  log.debug('Parsed %d records', context.records.length);
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
        log.debug('Inserted %d records',
          context.records.reduce((acc, record) => acc += (record.id) ? 1 : 0, 0));
        next(null, context);
      }
    });
  });
}

function saveETag (context, next) {
  const where = {etag: context.etag};
  db.select('id').from('etag').where(where).then(rows => {
    if (!rows.length) {
      db('etag').insert(where).then(() => {
        log.debug('Saved ETag: %s', context.etag);
        next(null, context);
      }).catch(next);
    } else {
      log.debug('Duplicate ETag: %s', context.etag);
      next(null, context);
    }
  }).catch(next);
}

function loadETag (context, next) {
  if (config.force) {
    return next(null, context);
  }
  db.select('etag').from('etag').orderBy('created', 'desc').limit(1).then(rows => {
    if (rows.length) {
      const row = rows.pop();
      log.debug('Got existing ETag: %s', row.etag);
      context.etag = row.etag;
    } else {
      log.debug('No existing ETag in DB');
    }
    next(null, context);
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
    process.exit(0);
  }
}

// XXX Only works for SQLite3, will need a different check for other DB engines
function checkSchema (context, next) {
  log.trace('Checking schema for %s', config.type);
  db.select('name').from('sqlite_master').where({
    type: 'table',
    name: config.type
  }).then((rows) => {
    context.createTables = !(rows && rows.length);
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

  log.debug(`Starting ${config.type} scraper`);

  waterfall([
    function init (next) {
      next(null, {
        etag: null
      });
    },
    checkSchema,
    loadSchema,
    loadETag,
    fetchHEAD,
    fetchBody,
    parseBody,
    insertRecords,
    saveETag,
    sendSlackNotification
  ], (error) => {

    db.destroy();

    if (error && error.graceful) {
      return log.trace('Stopping waterfall due to graceful exit request.');
    }

    if (error) {
      log.error(error);
      process.exit(1);
    }

    log.debug(`Scraping ${config.type} complete`);
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
  buildSlackPayload,
  sendSlackNotification,
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
      names: ['force', 'f'],
      type: 'bool',
      help: 'Ignore ETag and re-scrape.'
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
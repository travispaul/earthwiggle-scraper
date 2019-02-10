// do I have an etag?
//  -> no
//    -> make GET request
//    -> parse data
//    -> save etag
//  -> yes
//    -> Make HEAD request
//      -> Do I have latest etag?
//        -> no
//          -> parse data
//          -> store eta
//        -> yes
//          -> do nothing

const
  config = require('./config'),
  {waterfall} = require('vasync'),
  bunyan = require('bunyan');

let log;

function fetchHEAD (context, next) {
  if (!context.etag) {
    return next(null, context);
  }
}

function main (subcmd, opts) {

  Object.assign(config, opts);

  if (config.dump) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

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

  log.trace(`Starting ${config.type} scraper`);

  waterfall([
    function init (next) {
      next(null, {
        etag: null
      });
    },
    fetchHEAD
  ], (error) => {
    if (error) {
      log.error(error);
      process.exit(1);
    }
  });
}

module.exports = {
  main,
  fetchHEAD,
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
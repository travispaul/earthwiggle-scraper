const
  express = require('express'),
  bunyan = require('bunyan'),
  config = require('./config'),
  log = bunyan.createLogger({
    name: 'api',
    serializers: {
      req: require('bunyan-express-serializer')
    },
    streams: [{
      level: 'info',
      path: `${config.logpath}/api.log`
    },{
      stream: process.stdout
    }]
  }),
  app = express(),
  http = require('http'),
  knex = require('knex'),
  db = knex(config.knex);

app.set('case sensitive routing', true);
app.set('etag', false);

app.use(express.static('www'));

app.use((req, res, next) => {
  log.info({req});
  next();
});

app.use('/api/earthquake', require('./api_earthquake')(db, log));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    log.error(err);
  }
  res.status(status).json({
    errors: [{
      title: err.message || 'Internal Error',
      detail: err
    }]
  });
  next(); // Do I need to call next here?
});

function main (subcmd, options) {

  const port = parseInt(options.port) || 3000;

  app.set('port', port);

  const server = http.createServer(app);

  server.listen(port);
  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }
    log.error(error);
    process.exit(1);
  });

  server.on('listening', () => {
    const addr = server.address();
    log.info(`Listening on ${addr.port}`);
  });
}

module.exports = {
  app,
  main,
  db,
  options: [
    {
      names: ['port', 'p'],
      helpArg: 'PORT',
      type: 'string',
      help: 'Listen on PORT'
    }
  ],
  help: `Start JSON HTTP API server.
Usage:
    {{name}} {{cmd}}
{{options}}`
};
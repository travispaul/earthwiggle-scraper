const
    package = require('../package.json'),
    config = require('./config'),
    express = require('express'),
    router = express.Router(),
    crypto = require('crypto'),
    path = require('path'),
    {
      waterfall
    } = require('vasync');

let db, log;

function loadETag (context, next) {
  db.select('*').from('etag').orderBy('created', 'desc').limit(1).then((rows) => {
    let etagString = `${package.version}${JSON.stringify(context.query)}`;
    if (rows.length) {
      const {id, etag, created} = rows.pop();
      etagString += `${id}${etag}${created}`;
    }
    context.etag = crypto.createHash('md5').update(etagString).digest('hex');
    next(null, context);
  }).catch(next);
}

function buildResponseData (context, next) {
  let
    limit = 10,
    magnitude = 0;

  if (context.query.limit) {
    const requestedLimit = parseInt(context.query.limit, 10);
    if (requestedLimit <= 10 && requestedLimit > 0) {
      limit = context.query.limit;
    }
  }

  if (context.query.magnitude) {
    const requestedMagnitude = parseInt(context.query.magnitude, 10);
    if (requestedMagnitude > 0 && requestedMagnitude < 99) {
      magnitude = context.query.magnitude;
    }
  }

  let query = db.select('*').from('earthquake').orderBy('event', 'desc').where('magnitude', '>=', magnitude);

  if (context.query.province && context.query.province.length > 2 && context.query.province.length < 64 && /[a-zA-Z0-9 ]/.test(context.query.province)) {
    query = query.andWhere({province: context.query.province});
  }

  query.limit(limit).then((rows) => {
    context.rows = rows;
    next(null, context);
  }).catch(next);
}

function formatResponseData (context, next) {
  context.rows.forEach((row) => {
    row.img = `${config.imgURL}${path.basename(row.img)}`;
  });
  next(null, context);
}

router.get('/', (req, res) => {
  waterfall([
    (next) => {
      next(null, {query: req.query});
    },
    loadETag,
    buildResponseData,
    formatResponseData
  ], (error, context) => {
    if (error) {
      log.error(error);
      res.status(500).end();
      return;
    }
    res.set('etag', context.etag);
    res.status(200).json(context.rows);
  });
});

module.exports = (database, logger) => {
  log = logger;
  db = database;
  return router;
};
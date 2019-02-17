const
    express = require('express'),
    router = express.Router();

let db;

router.get('/', (req, res) => {
  let
    limit = 10,
    orderBy = 'desc',
    magnitude = 0;

  if (req.query.limit) {
    const requestedLimit = parseInt(req.query.limit, 10);
    if (requestedLimit <= 10 && requestedLimit > 0) {
      limit = req.query.limit;
    }
  }

  if (req.query.magnitude) {
    const requestedMagnitude = parseInt(req.query.magnitude, 10);
    if (requestedMagnitude > 0 && requestedMagnitude < 99) {
      magnitude = req.query.magnitude;
    }
  }

  if (['desc', 'asc'].indexOf(req.query.order) !== -1) {
    orderBy = req.query.order;
  }

  let query = db.select('*').from('earthquake').orderBy('event', orderBy).where('magnitude', '>', magnitude);

  if (req.query.location && req.query.location.length > 2 && req.query.location.length < 64 && /[a-zA-Z0-9 ]/.test(req.query.location)) {
    query = query.andWhere('location', 'like', `%(${req.query.location})`);
  }

  query.limit(limit).then(rows => {
    res.status(200).json(rows);
  });
});

module.exports = (database) => {
  db = database;
  return router;
};
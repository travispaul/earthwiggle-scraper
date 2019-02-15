const
    express = require('express'),
    router = express.Router();

router.post('/', (req, res) => {
  res.status(200).json({
    ok: true
  });
});

module.exports = router;
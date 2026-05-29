const { withReq } = require('../utils/logger');

function requestLogger(req, res, next) {
  const log = withReq(req);
  const start = Date.now();
  log.info({ msg: 'request.start', method: req.method, path: req.path });
  res.on('finish', () => {
    log.info({ msg: 'request.finish', status: res.statusCode, durationMs: Date.now() - start });
  });
  next();
}

module.exports = { requestLogger };

const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [new transports.Console()],
});

function withReq(req) {
  const requestId = req.id || 'no-req-id';
  return logger.child({ requestId });
}

module.exports = { logger, withReq };

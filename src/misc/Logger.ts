import winston from 'winston'


let logLevel = process.env.NODE_ENV != 'production' ? 'info' : 'silly'

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'api' },
  transports: []
})

logger.levels = { debug: 0, info: 1, silly: 2, warn: 3, error: 4 }
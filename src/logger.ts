import pino from 'pino';

// On Dockploy/Docker, we want simple JSON logs to stdout by default
// pino-pretty can sometimes swallow logs if not configured correctly in some environments
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Disable transport for production to ensure raw logs hit stdout
  ...(process.env.NODE_ENV === 'development'
    ? {
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }
    : {}),
});

// Route uncaught errors through pino so they get timestamps in stderr
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
});

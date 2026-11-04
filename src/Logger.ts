import { createLogger, format, transports } from "winston";

const myFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

export const logger = createLogger({
  level: "debug",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    myFormat,
  ),
  transports: [
    new transports.File({ filename: "error.log", level: "error" }), // all logs `error` (and below)
    new transports.File({ filename: "combined.log" }), // all logs `info` and below
  ],
});

export const configureLogger = (env: string) => {
  if (env === "development") {
    logger.add(
      new transports.Console({
        format: format.combine(format.colorize(), myFormat),
      }),
    );
  }
};

import chalk from "chalk";

enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

const getTimestamp = () => new Date().toISOString();

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.message}\n${error.stack}`;
  } else if (typeof error === "object") {
    return JSON.stringify(error, null, 2);
  } else if (error !== undefined) {
    return String(error);
  }
  return "";
};

const log = (
  level: LogLevel,
  message: string,
  error?: unknown,
  context?: string
) => {
  const timestamp = getTimestamp();
  let formattedMessage = `[${timestamp}] [${level}]`;

  if (context) {
    formattedMessage += ` [${context}]`;
  }

  formattedMessage += `: ${message}`;

  if (error) {
    formattedMessage += `\n${formatError(error)}`;
  }

  switch (level) {
    case LogLevel.INFO:
      console.log(chalk.blue(formattedMessage));
      break;
    case LogLevel.WARN:
      console.warn(chalk.yellow(formattedMessage));
      break;
    case LogLevel.ERROR:
      console.error(chalk.red(formattedMessage));
      break;
    case LogLevel.DEBUG:
      console.debug(chalk.gray(formattedMessage));
      break;
  }
};

export const logger = {
  info: (msg: string, err?: unknown, ctx?: string) =>
    log(LogLevel.INFO, msg, err, ctx),
  warn: (msg: string, err?: unknown, ctx?: string) =>
    log(LogLevel.WARN, msg, err, ctx),
  error: (msg: string, err?: unknown, ctx?: string) =>
    log(LogLevel.ERROR, msg, err, ctx),
  debug: (msg: string, err?: unknown, ctx?: string) =>
    log(LogLevel.DEBUG, msg, err, ctx),
};

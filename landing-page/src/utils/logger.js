/**
 * logger.js — Development-only logging utility.
 * Strips console.log in production while keeping warn/error.
 */
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args) => isDev && console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

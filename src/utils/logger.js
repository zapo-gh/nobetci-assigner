// Development-only logger
// Production'da console statements çalışmaz

import { APP_ENV } from '../config/index.js';

const isDevelopment = APP_ENV.isDevelopment;

export const logger = {
  error: (...args) => {
    console.error(...args);
  },

  warn: (...args) => {
    if (isDevelopment || APP_ENV.isProduction) {
      console.warn(...args);
    }
  },

  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  }
};

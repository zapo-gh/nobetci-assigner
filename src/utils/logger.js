// Development-only logger
// Production'da console statements çalışmaz

import { APP_ENV } from '../config/index.js';

const isDevelopment = APP_ENV.isDevelopment;
const isTest = APP_ENV.isTest;

export const logger = {
  error: (...args) => {
    if (isTest) return;
    console.error(...args);
  },

  warn: (...args) => {
    if (isTest) return;
    if (isDevelopment || APP_ENV.isProduction) {
      console.warn(...args);
    }
  },

  log: (...args) => {
    if (isTest) return;
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args) => {
    if (isTest) return;
    if (isDevelopment) {
      console.info(...args);
    }
  }
};

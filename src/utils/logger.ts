// Development-only logger
// Production'da console statements çalışmaz

import { APP_ENV } from '../config/index.js';

const isDevelopment = APP_ENV.isDevelopment;
const isTest = APP_ENV.isTest;

export const logger = {
  error: (...args: any[]): void => {
    if (isTest) return;
    console.error(...args);
  },

  warn: (...args: any[]): void => {
    if (isTest) return;
    if (isDevelopment || APP_ENV.isProduction) {
      console.warn(...args);
    }
  },

  log: (...args: any[]): void => {
    if (isTest) return;
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args: any[]): void => {
    if (isTest) return;
    if (isDevelopment) {
      console.info(...args);
    }
  }
};

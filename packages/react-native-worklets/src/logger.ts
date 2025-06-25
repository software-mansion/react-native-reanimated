'use strict';

const PREFIX = '[Worklets]';

function formatMessage(message: string) {
  return `${PREFIX} ${message}`;
}

export const logger = {
  warn(message: string) {
    console.warn(formatMessage(message));
  },
  error(message: string) {
    console.error(formatMessage(message));
  },
};

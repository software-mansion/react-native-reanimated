'use strict';

const PREFIX = '[Worklets]';
function formatMessage(message) {
  return `${PREFIX} ${message}`;
}
export const logger = {
  warn(message) {
    console.warn(formatMessage(message));
  },
  error(message) {
    console.error(formatMessage(message));
  }
};
//# sourceMappingURL=logger.js.map
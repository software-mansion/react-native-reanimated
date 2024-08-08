delete global.MessageChannel;
require('./src/jestUtils').setUpTests();

function formatMessage(msg) {
  return `[Reanimated] ${msg}`;
}

global.__reanimatedLogger = {
  warn(msg) {
    console.warn(formatMessage(msg));
  },
  error(msg) {
    console.log(formatMessage(msg));
  },
  fatal(msg) {
    console.log(formatMessage(msg));
  },
  newError(msg) {
    return new Error(formatMessage(msg));
  }
}

// @ts-nocheck
require('../src/jestUtils').setUpTests();

global.__reanimatedLoggerConfig = {
  logFunction: (data) => {
    switch (data.level) {
      case 1: // ReanimatedLogLevel.warn
        // eslint-disable-next-line reanimated/use-logger
        console.warn(data.message);
        break;
      case 2: // ReanimatedLogLevel.error
        // eslint-disable-next-line reanimated/use-logger
        console.error(data.message);
        break;
    }
  },
  level: 1, // ReanimatedLogLevel.warn
  strict: false,
};

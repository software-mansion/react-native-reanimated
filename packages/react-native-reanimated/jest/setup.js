// @ts-nocheck
delete global.MessageChannel;
require('../src/jestUtils').setUpTests();

jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock')
);

global.__reanimatedLoggerConfig = {
  logFunction: (data) => {
    switch (data.level) {
      case 'warn':
        // eslint-disable-next-line reanimated/use-logger
        console.warn(data.message.content);
        break;
      case 'error':
      case 'fatal':
      case 'syntax':
        // eslint-disable-next-line reanimated/use-logger
        console.error(data.message.content);
        break;
    }
  },
  level: 'warn',
  strict: false,
};

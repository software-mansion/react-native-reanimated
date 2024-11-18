delete global.MessageChannel;
require('./src/jestUtils').setUpTests();

global.__reanimatedLoggerConfig = {
  logFunction: (data) => {
    switch (data.level) {
      case 'warn':
        console.warn(data.message.content);
        break;
      case 'error':
      case 'fatal':
      case 'syntax':
        console.error(data.message.content);
        break;
    }
  },
  level: 'warn',
  strict: false,
};

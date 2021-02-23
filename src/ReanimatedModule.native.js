let Module;
if (process.env.JEST_WORKER_ID) {
  Module = require('./ReanimatedModuleCompat').default;
} else {
  Module = require('react-native').NativeModules.ReanimatedModule;
}

export default Module;

import { NativeModules } from 'react-native';

// Used for bare android device farm builds
const ExponentTest = (NativeModules && NativeModules.ExponentTest) || {
  get isInCI() {
    return false;
  },
  log: console.log,
  completed() {
    // noop
  },
  action() {
    // noop
  },
};

export default ExponentTest;

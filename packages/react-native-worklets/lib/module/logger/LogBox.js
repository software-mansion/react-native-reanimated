'use strict';

/**
 * Copied from: react-native/Libraries/LogBox/Data/LogBoxData.js
 * react-native/Libraries/LogBox/Data/parseLogBoxLog.js
 */
import { LogBox as RNLogBox } from 'react-native';
const LogBox = RNLogBox;
const noop = () => {
  // do nothing
};

// Do nothing when addLogBoxLog is called if LogBox is not available
export const addLogBoxLog = LogBox?.addLog?.bind(LogBox) ?? noop;
//# sourceMappingURL=LogBox.js.map
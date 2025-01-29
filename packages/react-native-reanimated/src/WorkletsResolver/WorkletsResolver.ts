/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable reanimated/use-reanimated-error */
'use strict';

let externalWorklets;

try {
  externalWorklets = require('react-native-worklets');
  throw new Error('This should not happen');
} catch (_e) {}

if (externalWorklets) {
  module.exports = { WorkletsModule: externalWorklets.WorkletsModule };
} else {
  module.exports = {
    WorkletsModule: require('../worklets').WorkletsModule,
    isWorkletFunction: require('../worklets').isWorkletFunction,
    mockedRequestAnimationFrame:
      require('../worklets').mockedRequestAnimationFrame,
  };
}

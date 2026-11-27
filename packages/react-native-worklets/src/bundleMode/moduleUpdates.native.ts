'use strict';

import { WorkletsModule } from '../WorkletsModule/NativeWorklets';

type HmrModule = {
  module: [number, string];
  sourceURL: string;
};

type MetroHMRClient = {
  addModuleUpdateListener?: (listener: (hmrModule: HmrModule) => void) => {
    remove: () => void;
  };
};

export function forwardModuleUpdatesToWorkletRuntimes(
  HMRClient: MetroHMRClient
) {
  if (typeof HMRClient.addModuleUpdateListener !== 'function') {
    return;
  }
  HMRClient.addModuleUpdateListener(({ module: [, code], sourceURL }) => {
    WorkletsModule.propagateModuleUpdate(code, sourceURL);
  });
}

'use strict';

type MetroHMRClient = {
  addModuleUpdateListener?: (
    listener: (code: string, sourceURL: string) => void
  ) => {
    remove: () => void;
  };
};

export function forwardModuleUpdatesToWorkletRuntimes(
  HMRClient: MetroHMRClient
) {
  const proxy = globalThis.__workletsModuleProxy;
  if (
    typeof HMRClient.addModuleUpdateListener !== 'function' ||
    typeof proxy.propagateModuleUpdate !== 'function'
  ) {
    return;
  }
  HMRClient.addModuleUpdateListener((code, sourceURL) => {
    proxy.propagateModuleUpdate?.(code, sourceURL);
  });
}

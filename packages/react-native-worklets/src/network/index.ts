'use strict';

import { TurboModuleRegistry } from 'react-native';

import { WorkletsError } from '../WorkletsError';

// const FileReaderModule = getHostObjectFromTurboModule(
//   TurboModuleRegistry.getEnforcing('FileReaderModule')
// );
// const PlatformConstans = getHostObjectFromTurboModule(
//   TurboModuleRegistry.getEnforcing('PlatformConstants')
// );
// const WebSocketModule = getHostObjectFromTurboModule(
//   TurboModuleRegistry.getEnforcing('WebSocketModule')
// );
const BlobModule = getHostObjectFromTurboModule(
  TurboModuleRegistry.getEnforcing('BlobModule')
);

export function initializeNetworking() {
  'worklet';

  const errorProxyFactory = (moduleName: string) => {
    return new Proxy(
      {},
      {
        get: (__, propName) => {
          throw new WorkletsError(
            `${propName as string} not available in ${moduleName}`
          );
        },
      }
    );
  };

  const BlobProxy = new Proxy(BlobModule, {
    get: (target, propName) => {
      if (propName === 'addNetworkingHandler') {
        return () => {};
      }
      if (propName === 'getConstants') {
        return target.getConstants.bind(BlobModule);
      } else {
        return undefined;
      }
    },
  });

  const TurboModules = (globalThis as Record<string, unknown>)
    .TurboModules as Map<string, unknown>;

  try {
    TurboModules.set('FileReaderModule', errorProxyFactory('FileReaderModule'));
    TurboModules.set(
      'PlatformConstants',
      errorProxyFactory('PlatformConstants')
    );
    TurboModules.set('WebSocketModule', errorProxyFactory('WebSocketModule'));
    TurboModules.set('BlobModule', BlobProxy);
  } catch (e) {
    console.error('Error initializing networking:', e);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native/Libraries/Core/setUpXHR');
}

function getHostObjectFromTurboModule(turboModule: object) {
  const hostObject = Object.getPrototypeOf(turboModule);
  if (!('mmmmmmagic' in hostObject)) {
    throw new WorkletsError(
      'Host object is not available. Make sure you are using the correct TurboModule.'
    );
  }
  return hostObject;
}

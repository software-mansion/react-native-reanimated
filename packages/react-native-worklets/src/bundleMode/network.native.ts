'use strict';

import { WorkletsError } from '../debug/WorkletsError';

export function initializeNetworking() {
  'worklet';

  const TurboModules = globalThis.TurboModules;

  const errorProxyFactory = (moduleName: string) => {
    return new Proxy(
      {},
      {
        get: (__, propName) => {
          if (propName === 'getConstants') {
            return () => ({ BLOB_URI_HOST: null, BLOB_URI_SCHEME: 'blob' });
          } else if (propName === 'addNetworkingHandler') {
            return () => {};
          }
          throw new WorkletsError(
            `${propName as string} not available in ${moduleName} on a Worklet Runtime.`
          );
        },
      }
    );
  };

  try {
    TurboModules.set('FileReaderModule', errorProxyFactory('FileReaderModule'));
    TurboModules.set(
      'PlatformConstants',
      errorProxyFactory('PlatformConstants')
    );
    TurboModules.set('WebSocketModule', errorProxyFactory('WebSocketModule'));
    TurboModules.set('BlobModule', errorProxyFactory('BlobModule'));
  } catch (e) {
    console.error('Error initializing networking:', e);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native/Libraries/Core/setUpXHR');
}

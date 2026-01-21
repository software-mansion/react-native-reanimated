'use strict';

import { WorkletsError } from '../debug/WorkletsError';

/**
 * Mocks necessary networking TurboModules on Worklet Runtimes to prevent
 * crashes when code running on Worklet Runtimes tries to use networking APIs.
 * The NetworkingModule itself is injected via C++.
 */
export function initializeNetworking() {
  const TurboModules = globalThis.TurboModules;

  TurboModules.set('FileReaderModule', makeMockTurboModule('FileReaderModule'));
  TurboModules.set(
    'PlatformConstants',
    makeMockTurboModule('PlatformConstants')
  );
  TurboModules.set('WebSocketModule', makeMockTurboModule('WebSocketModule'));
  TurboModules.set(
    'BlobModule',
    makeMockTurboModule('BlobModule', ['addNetworkingHandler'])
  );

  /**
   * This require statement below is the key part of the implementation here. It
   * pulls all the code that properly sets up XHR on a Runtime, using underlying
   * C++ NetworkingModule. Thanks to that we can have the same JavaScript
   * implementation for fetch on all runtimes in the app and we don't have to
   * write the code ourselves.
   */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native/Libraries/Core/setUpXHR');
}

const noopMethods = ['getConstants'];

function makeMockTurboModule(name: string, extraNoopMethods?: string[]) {
  const proxy = new Proxy(
    {},
    {
      get: function get(_target, prop) {
        if (
          [...noopMethods, ...(extraNoopMethods ?? [])].includes(prop as string)
        ) {
          return () => {
            return () => {};
          };
        }
        throw new WorkletsError(
          `You tried to call method '${String(
            prop
          )}' from '${name}' TurboModule on a Worklet Runtime. Using '${name}' TurboModule on a Worklet Runtime is not allowed.`
        );
      },
    }
  );

  return proxy;
}

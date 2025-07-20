// @ts-nocheck

'use strict';

import invariant from 'invariant';
import { TurboModuleRegistry } from 'react-native';

// const BlobManager = TurboModuleRegistry.getEnforcing;

const FileReaderModule = getHostObjectFromTurboModule(
  TurboModuleRegistry.getEnforcing('FileReaderModule')
);
const PlatformConstans = getHostObjectFromTurboModule(
  TurboModuleRegistry.getEnforcing('PlatformConstants')
);
const WebSocketModule = getHostObjectFromTurboModule(
  TurboModuleRegistry.getEnforcing('WebSocketModule')
);
const BlobModule = getHostObjectFromTurboModule(
  TurboModuleRegistry.getEnforcing('BlobModule')
);

// const NetworkingModule = getHostObjectFromTurboModule(
//   TurboModuleRegistry.getEnforcing('Networking')
// );

export function initializeNetworking() {
  'worklet';
  try {
    globalThis.TurboModules.set('FileReaderModule', FileReaderModule);
    globalThis.TurboModules.set('PlatformConstants', PlatformConstans);
    globalThis.TurboModules.set('WebSocketModule', WebSocketModule);
    globalThis.TurboModules.set('BlobModule', BlobModule);
    // globalThis.TurboModules.set('Networking', NetworkingModule);
  } catch (e) {
    console.error('Error initializing networking:', e);
  }
  // console.log('dupa');
  // console.log('globalThis.fetch', globalThis.fetch?.toString());
  // console.log(Object.keys(globalThis));
  require('react-native/Libraries/Core/setUpXHR');
  // console.log('globalThis.fetch', globalThis.fetch.toString());
  // console.log(Object.keys(globalThis));
  // console.log(www);
  // console.log('post dupa');
}

function getHostObjectFromTurboModule(turboModule: object) {
  const hostObject = Object.getPrototypeOf(turboModule);
  console.log(turboModule, hostObject);
  invariant('mmmmmmagic' in hostObject, 'Host object is available.');
  return hostObject;
}

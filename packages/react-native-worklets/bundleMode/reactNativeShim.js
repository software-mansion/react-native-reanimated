'use strict';

if(globalThis.__RUNTIME_KIND === undefined || globalThis.__RUNTIME_KIND === 1) {
  globalThis.__RUNTIME_KIND = 1;
} else {
  throw new Error(
    "[Worklets] Importing 'react-native' is not allowed on a Worklet Runtime."
  );
}

export * from 'react-native';

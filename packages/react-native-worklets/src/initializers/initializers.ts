'use strict';

import { IS_JEST } from '../platformChecker';
import { mockedRequestAnimationFrame } from '../runLoop/uiRuntime/mockedRequestAnimationFrame';
import { RuntimeKind } from '../runtimeKind';

export function init() {
  globalThis._WORKLET = false;
  globalThis.__RUNTIME_KIND = RuntimeKind.ReactNative;
  globalThis._log = console.log;
  globalThis._getAnimationTimestamp = () => performance.now();
  if (IS_JEST) {
    // requestAnimationFrame react-native jest's setup is incorrect as it polyfills
    // the method directly using setTimeout, therefore the callback doesn't get the
    // expected timestamp as the only argument: https://github.com/facebook/react-native/blob/main/packages/react-native/jest/setup.js#L28
    // We override this setup here to make sure that callbacks get the proper timestamps
    // when executed. For non-jest environments we define requestAnimationFrame in setupRequestAnimationFrame
    // @ts-ignore TypeScript uses Node definition for rAF, setTimeout, etc which returns a Timeout object rather than a number
    globalThis.requestAnimationFrame = mockedRequestAnimationFrame;
  }
}

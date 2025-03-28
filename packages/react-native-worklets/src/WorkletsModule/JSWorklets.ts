/* eslint-disable reanimated/use-reanimated-error */
'use strict';

import { mockedRequestAnimationFrame } from '../animationFrameQueue/mockedRequestAnimationFrame';
import { isJest } from '../PlatformChecker';
import { WorkletsError } from '../WorkletsError';
import type { ShareableRef } from '../workletTypes';
import type { IWorkletsModule } from './workletsModuleProxy';

export function createJSWorkletsModule(): IWorkletsModule {
  return new JSWorklets();
}

// In Node.js environments (like when static rendering with Expo Router)
// requestAnimationFrame is unavailable, so we use our mock.
// It also has to be mocked for Jest purposes (see `initializeUIRuntime`).
const requestAnimationFrameImpl =
  isJest() || !globalThis.requestAnimationFrame
    ? mockedRequestAnimationFrame
    : globalThis.requestAnimationFrame;

class JSWorklets implements IWorkletsModule {
  makeShareableClone(): never {
    throw new WorkletsError(
      'makeShareableClone should never be called in JSWorklets.'
    );
  }

  makeSynchronizable(): never {
    throw new WorkletsError(
      'makeSynchronizable should never be called in JSWorklets.'
    );
  }

  scheduleOnUI<TValue>(worklet: ShareableRef<TValue>) {
    // TODO: `requestAnimationFrame` should be used exclusively in Reanimated

    // @ts-ignore web implementation has still not been updated after the rewrite,
    // this will be addressed once the web implementation updates are ready
    requestAnimationFrameImpl(worklet);
  }

  executeOnUIRuntimeSync(): never {
    throw new WorkletsError(
      '`executeOnUIRuntimeSync` is not available in JSWorklets.'
    );
  }

  createWorkletRuntime(): never {
    throw new WorkletsError(
      'createWorkletRuntime is not available in JSWorklets.'
    );
  }

  scheduleOnRuntime(): never {
    throw new WorkletsError(
      'scheduleOnRuntime is not available in JSWorklets.'
    );
  }
}

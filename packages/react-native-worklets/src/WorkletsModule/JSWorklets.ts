/* eslint-disable reanimated/use-reanimated-error */
'use strict';

import { mockedRequestAnimationFrame } from '../animationFrameQueue/mockedRequestAnimationFrame';
import { isJest } from '../PlatformChecker';
import { WorkletsError } from '../WorkletsError';
import type { ShareableRef, WorkletRuntime } from '../workletTypes';
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
  makeShareableClone<TValue>(): ShareableRef<TValue> {
    throw new WorkletsError(
      'makeShareableClone should never be called in JSWorklets.'
    );
  }

  makeShareableString(_string: string): ShareableRef<string> {
    throw new WorkletsError(
      'makeShareableString should never be called in JSWorklets.'
    );
  }

  scheduleOnUI<TValue>(worklet: ShareableRef<TValue>) {
    // TODO: `requestAnimationFrame` should be used exclusively in Reanimated

    // @ts-ignore web implementation has still not been updated after the rewrite,
    // this will be addressed once the web implementation updates are ready
    requestAnimationFrameImpl(worklet);
  }

  executeOnUIRuntimeSync<T, R>(_shareable: ShareableRef<T>): R {
    throw new WorkletsError(
      '`executeOnUIRuntimeSync` is not available in JSWorklets.'
    );
  }

  createWorkletRuntime(
    _name: string,
    _initializer: ShareableRef<() => void>
  ): WorkletRuntime {
    throw new WorkletsError(
      'createWorkletRuntime is not available in JSWorklets.'
    );
  }

  scheduleOnRuntime() {
    throw new WorkletsError(
      'scheduleOnRuntime is not available in JSWorklets.'
    );
  }
}

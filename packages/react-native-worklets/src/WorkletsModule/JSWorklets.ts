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
  // eslint-disable-next-line @ericcornelissen/top/no-top-level-side-effects
  isJest() || !globalThis.requestAnimationFrame
    ? mockedRequestAnimationFrame
    : globalThis.requestAnimationFrame;

class JSWorklets implements IWorkletsModule {
  makeShareableClone<TValue>(): ShareableRef<TValue> {
    throw new WorkletsError(
      'makeShareableClone should never be called in JSWorklets.'
    );
  }

  makeShareableString(): ShareableRef<string> {
    throw new WorkletsError(
      'makeShareableString should never be called in JSWorklets.'
    );
  }

  makeShareableNumber(): ShareableRef<number> {
    throw new WorkletsError(
      'makeShareableNumber should never be called in JSWorklets.'
    );
  }

  makeShareableBoolean(): ShareableRef<boolean> {
    throw new WorkletsError(
      'makeShareableBoolean should never be called in JSWorklets.'
    );
  }

  makeShareableBigInt(): ShareableRef<bigint> {
    throw new WorkletsError(
      'makeShareableBigInt should never be called in JSWorklets.'
    );
  }

  makeShareableUndefined(): ShareableRef<undefined> {
    throw new WorkletsError(
      'makeShareableUndefined should never be called in JSWorklets.'
    );
  }

  makeShareableNull(): ShareableRef<null> {
    throw new WorkletsError(
      'makeShareableNull should never be called in JSWorklets.'
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

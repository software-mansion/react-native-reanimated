'use strict';
import { IS_JEST } from './common';
import { initSvgCssSupport } from './css/svg';
import { getStaticFeatureFlag } from './featureFlags';
import type { IReanimatedModule } from './ReanimatedModule';

export function initializeReanimatedModule(
  _ReanimatedModule: IReanimatedModule
) {
  initializeWebGlobals();
  if (getStaticFeatureFlag('EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS')) {
    initSvgCssSupport();
  }
}

function initializeWebGlobals() {
  if (globalThis._getAnimationTimestamp === undefined) {
    globalThis._getAnimationTimestamp = () => performance.now();
  }
  if (IS_JEST) {
    globalThis.requestAnimationFrame = ((
      callback: (timestamp: number) => void
    ) =>
      setTimeout(
        () => callback(performance.now()),
        0
      )) as unknown as typeof globalThis.requestAnimationFrame;
  }
}

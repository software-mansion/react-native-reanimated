'use strict';
import { initSvgCssSupport } from './css/svg';
import { getStaticFeatureFlag } from './featureFlags';
import type { IReanimatedModule } from './ReanimatedModule';

export function initializeReanimatedModule(
  _ReanimatedModule: IReanimatedModule
) {
  if (getStaticFeatureFlag('EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS')) {
    initSvgCssSupport();
  }
}

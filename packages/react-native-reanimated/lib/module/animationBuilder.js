'use strict';

import { logger } from './common';
const mockTargetValues = {
  targetOriginX: 0,
  targetOriginY: 0,
  targetWidth: 0,
  targetHeight: 0,
  targetGlobalOriginX: 0,
  targetGlobalOriginY: 0,
  targetBorderRadius: 0,
  windowWidth: 0,
  windowHeight: 0,
  currentOriginX: 0,
  currentOriginY: 0,
  currentWidth: 0,
  currentHeight: 0,
  currentGlobalOriginX: 0,
  currentGlobalOriginY: 0,
  currentBorderRadius: 0
};
function getCommonProperties(layoutStyle, componentStyle) {
  let componentStyleFlat = Array.isArray(componentStyle) ? componentStyle.flat() : [componentStyle];
  componentStyleFlat = componentStyleFlat.filter(Boolean);
  componentStyleFlat = componentStyleFlat.map(style => 'initial' in style ? style.initial.value // Include properties of animated style
  : style);
  const componentStylesKeys = componentStyleFlat.flatMap(style => Object.keys(style));
  const commonKeys = Object.keys(layoutStyle).filter(key => componentStylesKeys.includes(key));
  return commonKeys;
}
function maybeReportOverwrittenProperties(layoutAnimationStyle, style, displayName) {
  const commonProperties = getCommonProperties(layoutAnimationStyle, style);
  if (commonProperties.length > 0) {
    logger.warn(`${commonProperties.length === 1 ? 'Property' : 'Properties'} "${commonProperties.join(', ')}" of ${displayName} may be overwritten by a layout animation. Please wrap your component with an animated view and apply the layout animation on the wrapper.`);
  }
}
export function maybeBuild(layoutAnimationOrBuilder, style, displayName) {
  const isAnimationBuilder = value => 'build' in layoutAnimationOrBuilder && typeof layoutAnimationOrBuilder.build === 'function';
  if (isAnimationBuilder(layoutAnimationOrBuilder)) {
    const animationFactory = layoutAnimationOrBuilder.build();
    if (__DEV__ && style) {
      const layoutAnimation = animationFactory(mockTargetValues);
      maybeReportOverwrittenProperties(layoutAnimation.animations, style, displayName);
    }
    return animationFactory;
  } else {
    return layoutAnimationOrBuilder;
  }
}
//# sourceMappingURL=animationBuilder.js.map
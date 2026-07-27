'use strict';
import { logger } from './common';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
  LayoutAnimationValues,
  StyleProps,
} from './commonTypes';
import type { NestedArray } from './createAnimatedComponent/commonTypes';
import type { ReanimatedKeyframe } from './layoutReanimation/animationBuilder/Keyframe';

const mockTargetValues: LayoutAnimationValues = {
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
  currentBorderRadius: 0,
};

function getCommonProperties(
  layoutStyle: StyleProps,
  componentStyle: NestedArray<StyleProps>
) {
  let componentStyleFlat = Array.isArray(componentStyle)
    ? componentStyle.flat()
    : [componentStyle];

  componentStyleFlat = componentStyleFlat.filter(Boolean);

  componentStyleFlat = componentStyleFlat.map((style) =>
    'initial' in style
      ? style.initial.value // Include properties of animated style
      : style
  );

  const componentStylesKeys = componentStyleFlat.flatMap((style) =>
    Object.keys(style)
  );

  const commonKeys = Object.keys(layoutStyle).filter((key) =>
    componentStylesKeys.includes(key)
  );

  return commonKeys;
}

export function checkStyleOverwriting(
  layoutAnimationOrBuilder:
    | ILayoutAnimationBuilder
    | LayoutAnimationFunction
    | ReanimatedKeyframe,
  style: NestedArray<StyleProps>,
  displayName: string,
  onWarn: () => void
): void {
  if (!isAnimationBuilder(layoutAnimationOrBuilder)) {
    return;
  }

  const animationFactory = layoutAnimationOrBuilder.build();

  const layoutAnimation = animationFactory(mockTargetValues);
  maybeReportOverwrittenProperties(
    layoutAnimation.animations,
    style,
    displayName,
    onWarn
  );
}

function maybeReportOverwrittenProperties(
  layoutAnimationStyle: StyleProps,
  style: NestedArray<StyleProps>,
  displayName: string,
  onWarn: () => void
) {
  const commonProperties = getCommonProperties(layoutAnimationStyle, style);

  if (commonProperties.length > 0) {
    logger.warn(
      `${
        commonProperties.length === 1 ? 'Property' : 'Properties'
      } "${commonProperties.join(
        ', '
      )}" of ${displayName} may be overwritten by a layout animation. Please wrap your component with an animated view and apply the layout animation on the wrapper.`
    );
    onWarn();
  }
}

export function maybeBuild(
  layoutAnimationOrBuilder:
    | ILayoutAnimationBuilder
    | LayoutAnimationFunction
    | ReanimatedKeyframe
): LayoutAnimationFunction | ReanimatedKeyframe {
  if (isAnimationBuilder(layoutAnimationOrBuilder)) {
    const animationFactory = layoutAnimationOrBuilder.build();
    return animationFactory;
  } else {
    return layoutAnimationOrBuilder;
  }
}

function isAnimationBuilder(
  value: ILayoutAnimationBuilder | LayoutAnimationFunction | ReanimatedKeyframe
): value is ILayoutAnimationBuilder {
  return 'build' in value && typeof value.build === 'function';
}

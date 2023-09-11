'use strict';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
  LayoutAnimationsValues,
} from './reanimated2/layoutReanimation';
import type { StyleProps } from './reanimated2/commonTypes';

const mockTargetValues: LayoutAnimationsValues = {
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

export function maybeBuild(
  layoutAnimationOrBuilder:
    | ILayoutAnimationBuilder
    | LayoutAnimationFunction
    | Keyframe,
  style: StyleProps | undefined,
  displayName: string
): LayoutAnimationFunction | Keyframe {
  const isAnimationBuilder = (
    value: ILayoutAnimationBuilder | LayoutAnimationFunction | Keyframe
  ): value is ILayoutAnimationBuilder =>
    'build' in layoutAnimationOrBuilder &&
    typeof layoutAnimationOrBuilder.build === 'function';

  if (isAnimationBuilder(layoutAnimationOrBuilder)) {
    const animationFactory = layoutAnimationOrBuilder.build();
    const layoutAnimation = animationFactory(mockTargetValues);
    const animatedStyle = layoutAnimation.animations;

    const getCommonProperties = (obj1: object, obj2: object) =>
      Object.keys(obj1).filter((key) =>
        Object.prototype.hasOwnProperty.call(obj2, key)
      );

    const commonProperties = getCommonProperties(animatedStyle, style || {});
    if (commonProperties.length > 0) {
      console.warn(
        `[Reanimated] ${
          commonProperties.length === 1 ? 'Property' : 'Properties: '
        } "${commonProperties}" of ${displayName} may be overwritten with layout animation. Please create a wrapper with the layout animation you want to apply.`
      );
    }

    return layoutAnimationOrBuilder.build();
  } else {
    return layoutAnimationOrBuilder;
  }
}

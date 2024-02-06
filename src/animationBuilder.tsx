'use strict';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
  LayoutAnimationsValues,
} from './reanimated2/layoutReanimation';
import type { StyleProps } from './reanimated2/commonTypes';
import type { NestedArray } from './createAnimatedComponent/commonTypes';

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

function maybeReportOverwrittenProperties(
  layoutAnimationStyle: StyleProps,
  style: NestedArray<StyleProps>,
  displayName: string
) {
  function getCommonProperties(
    layoutStyle: object,
    secondStyle: object | Array<object>
  ) {
    const secondStyleFlat = Array.isArray(secondStyle)
      ? secondStyle.flat()
      : [secondStyle];
    const commonKeys: Array<string> = [];

    secondStyleFlat.forEach((s) => {
      if ('initial' in s) {
        s = s.initial.value;
      }

      const commonStyleKeys = Object.keys(s).filter((key) =>
        Object.prototype.hasOwnProperty.call(layoutStyle, key)
      );
      commonKeys.push(...commonStyleKeys);
    });
    return commonKeys;
  }

  const commonProperties = getCommonProperties(layoutAnimationStyle, style);

  if (commonProperties.length > 0) {
    console.warn(
      `[Reanimated] ${
        commonProperties.length === 1 ? 'Property' : 'Properties: '
      } "${commonProperties.join(
        ', '
      )}" of ${displayName} may be overwritten with layout animation. Please create a wrapper with the layout animation you want to apply.`
    );
  }
}

export function maybeBuild(
  layoutAnimationOrBuilder:
    | ILayoutAnimationBuilder
    | LayoutAnimationFunction
    | Keyframe,
  style: NestedArray<StyleProps> | undefined,
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
    const layoutAnimationStyle = layoutAnimation.animations;

    if (__DEV__) {
      maybeReportOverwrittenProperties(
        layoutAnimationStyle,
        style || {},
        displayName
      );
    }

    return layoutAnimationOrBuilder.build();
  } else {
    return layoutAnimationOrBuilder;
  }
}

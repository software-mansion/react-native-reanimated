'use strict';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from './layoutReanimation';
import type { StyleProps } from './commonTypes';
import type { NestedArray } from './createAnimatedComponent/commonTypes';
import { logger } from './logger';
import type {
  StyleTransitionAnimationFunction,
  StyleTransitionAnimationsValues,
} from './layoutReanimation/animationBuilder/commonTypes';

const propBaseList = [
  `OriginX`,
  `OriginY`,
  `GlobalOriginX`,
  `GlobalOriginY`,
  'Width',
  'Height',
  'Opacity',
  'BorderRadius',
  ...(['Top', 'Bottom', 'Left', 'Right'] as const).map(
    (direction) => `Border${direction}Width` as const
  ),
  ...(['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'] as const).map(
    (direction) => `Border${direction}Radius` as const
  ),
] as const;

const mockTargetValues = Object.fromEntries(
  propBaseList.map((propName) => [`target${propName}`, 0])
);
const mockCurrentValues = Object.fromEntries(
  propBaseList.map((propName) => [`current${propName}`, 0])
);

const mockValues = {
  ...mockTargetValues,
  ...mockCurrentValues,
  windowWidth: 0,
  windowHeight: 0,
} as StyleTransitionAnimationsValues;

function getCommonProperties(
  layoutStyle: StyleProps,
  componentStyle: StyleProps | Array<StyleProps>
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

function maybeReportOverwrittenProperties(
  layoutAnimationStyle: StyleProps,
  style: NestedArray<StyleProps>,
  displayName: string
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
  }
}

export function maybeBuild(
  layoutAnimationOrBuilder:
    | ILayoutAnimationBuilder
    | LayoutAnimationFunction
    | StyleTransitionAnimationFunction
    | Keyframe,
  style: NestedArray<StyleProps> | undefined,
  displayName: string
): LayoutAnimationFunction | StyleTransitionAnimationFunction | Keyframe {
  const isAnimationBuilder = (
    value:
      | ILayoutAnimationBuilder
      | LayoutAnimationFunction
      | StyleTransitionAnimationFunction
      | Keyframe
  ): value is ILayoutAnimationBuilder =>
    'build' in value && typeof value.build === 'function';

  if (isAnimationBuilder(layoutAnimationOrBuilder)) {
    const animationFactory = layoutAnimationOrBuilder.build();

    if (__DEV__ && style) {
      const layoutAnimation = animationFactory(mockValues);
      maybeReportOverwrittenProperties(
        layoutAnimation.animations,
        style,
        displayName
      );
    }

    return animationFactory;
  } else {
    return layoutAnimationOrBuilder;
  }
}

'use strict';
import type {
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
} from './layoutReanimation';

export function maybeBuild(
  layoutAnimationOrBuilder:
    | ILayoutAnimationBuilder
    | LayoutAnimationFunction
    | Keyframe
): LayoutAnimationFunction | Keyframe {
  const isAnimationBuilder = (
    value: ILayoutAnimationBuilder | LayoutAnimationFunction | Keyframe
  ): value is ILayoutAnimationBuilder =>
    'build' in layoutAnimationOrBuilder &&
    typeof layoutAnimationOrBuilder.build === 'function';

  if (isAnimationBuilder(layoutAnimationOrBuilder)) {
    const animationFactory = layoutAnimationOrBuilder.build();

    return animationFactory;
  } else {
    return layoutAnimationOrBuilder;
  }
}

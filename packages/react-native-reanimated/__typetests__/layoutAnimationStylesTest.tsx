/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Type tests for the strict `AnimatedLayoutStyles` / `AnimatedTransformItem`
 * types passed to `LayoutAnimation.animations`. The `animations` field used to
 * be `StyleProps` (raw values), which rejected animation objects on explicit
 * numeric properties like `originX`. It is now `AnimatedLayoutStyles`, whose
 * properties accept `AnimationObject`s — and whose `transform` accepts an array
 * of single-key objects with `AnimationObject` values.
 */
import type {
  AnimatedLayoutStyles,
  AnimatedTransformItem,
  EntryAnimationsValues,
  LayoutAnimation,
} from '..';
import { withDelay, withSpring, withTiming } from '..';

function LayoutAnimationFunctionReturn(values: EntryAnimationsValues) {
  'worklet';
  const result: LayoutAnimation = {
    initialValues: {
      opacity: 0,
      originX: 0,
    },
    animations: {
      // `AnimationObject` values are accepted on every property — including
      // the explicit numeric ones like `originX` that StyleProps types as
      // `number`.
      opacity: withTiming(1),
      originX: withDelay(100, withTiming(50)),
      width: withSpring(200),
    },
  };
  return result;
}

function LayoutAnimationTransformArray(values: EntryAnimationsValues) {
  'worklet';
  const result: LayoutAnimation = {
    initialValues: {
      transform: [{ translateX: 0 }, { scale: 1 }],
    },
    animations: {
      // Each transform array entry is a single-key object whose value is an
      // animation. `AnimatedTransformItem` allows the `?: undefined` sibling
      // exclusion fields TypeScript synthesizes for narrowed unions.
      transform: [{ translateX: withTiming(100) }, { scale: withSpring(1.5) }],
    },
  };
  return result;
}

function AnimatedTransformItemAcceptsSingleKey() {
  const item: AnimatedTransformItem = { translateX: withTiming(100) };
  const item2: AnimatedTransformItem = { rotate: withTiming('45deg') };
}

function AnimatedLayoutStylesAcceptsAnimationsAndTransform() {
  const styles: AnimatedLayoutStyles = {
    opacity: withTiming(1),
    transform: [{ translateY: withTiming(0) }],
  };
}

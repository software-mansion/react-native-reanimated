/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native';

import type { AnimatedStyle } from '..';
import { cubicBezier, linear, steps } from '..';

// Regression coverage for
// https://github.com/software-mansion/react-native-reanimated/issues/9328.
//
// Expo's generated `expo-env.d.ts` augments React Native's `ViewStyle`,
// `TextStyle`, and `ImageStyle` with CSS-like animation/transition fields to
// mirror react-native-web semantics (e.g. `animationTimingFunction?: string`).
// Reanimated's own CSS types intersect these same keys with narrower shapes
// (`CSSTimingFunction`, keyframe objects, etc.). Before the Omit-and-merge in
// `AnimatedStyle`, the intersection collapsed conflicting properties to
// `never` and surfaced as "Type … is not assignable to 'undefined'" on inline
// `style={{ ... }}` for `Animated.View`/`Animated.Text`/`Animated.Image`.

type ExpoStyleAugmentation = {
  animationName?: string;
  animationDuration?: string | number;
  animationTimingFunction?:
    | 'ease'
    | 'linear'
    | 'ease-in'
    | 'ease-out'
    | 'ease-in-out';
  animationDelay?: string | number;
  animationIterationCount?: number | 'infinite';
  animationDirection?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  animationFillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  animationPlayState?: 'running' | 'paused';
  transitionProperty?: string | string[];
  transitionDuration?: string | number;
  transitionTimingFunction?: 'ease' | 'linear';
  transitionDelay?: string | number;
  transitionBehavior?: 'normal' | 'allow-discrete';
  transition?: string;
};

type AugmentedViewStyle = ViewStyle & ExpoStyleAugmentation;
type AugmentedTextStyle = TextStyle & ExpoStyleAugmentation;
type AugmentedImageStyle = ImageStyle & ExpoStyleAugmentation;

function AnimatedStyleAugmentationTest() {
  function ParametrizedTimingFunctionsOnAugmentedView() {
    const cubic: AnimatedStyle<AugmentedViewStyle> = {
      width: 100,
      backgroundColor: 'red',
      animationName: {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
      animationDuration: '1s',
      animationTimingFunction: cubicBezier(0.25, 0.1, 0.25, 1),
      animationDelay: 0,
      animationIterationCount: 'infinite',
      animationDirection: 'alternate',
      animationFillMode: 'both',
      animationPlayState: 'running',
    };
    const lin: AnimatedStyle<AugmentedViewStyle> = {
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
      animationTimingFunction: linear(0, 0.5, 1),
    };
    const stp: AnimatedStyle<AugmentedViewStyle> = {
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
      animationTimingFunction: steps(4),
    };
  }

  function PredefinedTimingFunctionsOnAugmentedView() {
    const s: AnimatedStyle<AugmentedViewStyle> = {
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
      animationTimingFunction: 'ease-in-out',
    };
  }

  function ArrayShorthandsOnAugmentedView() {
    const s: AnimatedStyle<AugmentedViewStyle> = {
      animationName: [
        { from: { opacity: 0 }, to: { opacity: 1 } },
        {
          from: { transform: [{ scale: 0 }] },
          to: { transform: [{ scale: 1 }] },
        },
      ],
      animationDuration: ['1s', '2s'],
      animationTimingFunction: [cubicBezier(0.25, 0.1, 0.25, 1), 'ease'],
    };
  }

  function CSSTransitionsOnAugmentedView() {
    const s: AnimatedStyle<AugmentedViewStyle> = {
      width: 100,
      transitionProperty: 'width',
      transitionDuration: '500ms',
      transitionTimingFunction: cubicBezier(0.25, 0.1, 0.25, 1),
      transitionDelay: 0,
      transitionBehavior: 'allow-discrete',
    };
  }

  function CSSAnimationOnAugmentedText() {
    const s: AnimatedStyle<AugmentedTextStyle> = {
      color: 'black',
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
      animationTimingFunction: cubicBezier(0.25, 0.1, 0.25, 1),
    };
  }

  function CSSAnimationOnAugmentedImage() {
    const s: AnimatedStyle<AugmentedImageStyle> = {
      resizeMode: 'cover',
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
      animationTimingFunction: cubicBezier(0.25, 0.1, 0.25, 1),
    };
  }

  function NonCSSStylesUnaffected() {
    const s: AnimatedStyle<AugmentedViewStyle> = {
      width: 100,
      height: 100,
      backgroundColor: 'blue',
      transform: [{ translateX: 10 }, { scale: 2 }],
      opacity: 0.5,
    };
  }

  // Sanity-check: plain `ViewStyle` without the augmented CSS fields still works.
  function PlainViewStyleStillWorks() {
    const s: AnimatedStyle<ViewStyle> = {
      width: 100,
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
      animationTimingFunction: cubicBezier(0.25, 0.1, 0.25, 1),
    };
  }

  // `AnimatedStyle<StyleProp<…>>` is a union (null, arrays, etc.); the Omit
  // must distribute over union members to strip augmented CSS keys from the
  // object member — this is the exact shape that fails in the issue's repro.
  function StylePropUnionMirrorsRealRepro() {
    const s: AnimatedStyle<StyleProp<AugmentedViewStyle>> = {
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
      animationTimingFunction: cubicBezier(0, 0, 0, 0),
    };
  }
}

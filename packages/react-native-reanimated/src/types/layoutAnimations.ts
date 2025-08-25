import type { SerializableRef } from 'react-native-worklets';

import type { EasingFunction, StyleProps } from '../commonTypes';
import type { AnyRecord, PlainStyle } from '../css/types';
import type { EasingFunctionFactory } from '../Easing';

type LayoutAnimationOptions =
  | 'originX'
  | 'originY'
  | 'width'
  | 'height'
  | 'borderRadius'
  | 'globalOriginX'
  | 'globalOriginY';

type CurrentLayoutAnimationValues = {
  [K in LayoutAnimationOptions as `current${Capitalize<string & K>}`]: number;
};

type TargetLayoutAnimationValues = {
  [K in LayoutAnimationOptions as `target${Capitalize<string & K>}`]: number;
};

interface WindowDimensions {
  windowWidth: number;
  windowHeight: number;
}

// TODO - include originX and originY
export type KeyframeProps<TStyle extends AnyRecord = PlainStyle> = TStyle & {
  easing?: EasingFunction | EasingFunctionFactory;
};

type FirstFrame =
  | {
      0: KeyframeProps & { easing?: never };
      from?: never;
    }
  | {
      0?: never;
      from: KeyframeProps & { easing?: never };
    };

type LastFrame =
  | { 100?: KeyframeProps; to?: never }
  | { 100?: never; to: KeyframeProps };

export type ValidKeyframeProps = FirstFrame &
  LastFrame &
  Record<number, KeyframeProps>;

export type MaybeInvalidKeyframeProps = Record<number, KeyframeProps> & {
  to?: KeyframeProps;
  from?: KeyframeProps;
};

export type LayoutAnimation<TStyle extends AnyRecord = PlainStyle> = {
  initialValues: TStyle;
  animations: TStyle;
  callback?: (finished: boolean) => void;
};

export type EntryAnimationsValues = TargetLayoutAnimationValues &
  WindowDimensions;

export type ExitAnimationsValues = CurrentLayoutAnimationValues &
  WindowDimensions;

export type EntryExitAnimationFunction =
  | ((targetValues: EntryAnimationsValues) => LayoutAnimation)
  | ((targetValues: ExitAnimationsValues) => LayoutAnimation)
  | (() => LayoutAnimation);

export type AnimationConfigFunction<T> = (targetValues: T) => LayoutAnimation;

export type LayoutAnimationValues = CurrentLayoutAnimationValues &
  TargetLayoutAnimationValues &
  WindowDimensions;

export enum LayoutAnimationType {
  ENTERING = 1,
  EXITING = 2,
  LAYOUT = 3,
}

export type LayoutAnimationFunction = (
  targetValues: LayoutAnimationValues
) => LayoutAnimation;

export type LayoutAnimationStartFunction = (
  tag: number,
  type: LayoutAnimationType,
  yogaValues: Partial<LayoutAnimationValues>,
  config: (arg: Partial<LayoutAnimationValues>) => LayoutAnimation
) => void;

export interface ILayoutAnimationBuilder {
  build: () => LayoutAnimationFunction;
}

// export type AnimationFunction = (a?: any, b?: any, c?: any) => any; // this is just a temporary mock

export interface BaseLayoutAnimationConfig {
  duration?: number;
  easing?: EasingFunction | EasingFunctionFactory;
  type?: AnimationFunction; // TODO - fix type
  damping?: number;
  dampingRatio?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: number;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
}

export interface BaseBuilderAnimationConfig extends BaseLayoutAnimationConfig {
  rotate?: number | string;
}

export type LayoutAnimationAndConfig = [
  AnimationFunction,
  BaseBuilderAnimationConfig,
];

export interface IEntryExitAnimationBuilder {
  build: () => EntryExitAnimationFunction;
}

export interface IEntryAnimationBuilder {
  build: () => AnimationConfigFunction<EntryAnimationsValues>;
}

export interface IExitAnimationBuilder {
  build: () => AnimationConfigFunction<ExitAnimationsValues>;
}

/**
 * Used to configure the `.defaultTransitionType()` shared transition modifier.
 *
 * @experimental
 */

export type EntryExitAnimationsValues =
  | EntryAnimationsValues
  | ExitAnimationsValues;

// TODO - maybe remove or improve
export type StylePropsWithArrayTransform = StyleProps & {
  transform?: TransformArrayItem[];
};

export interface LayoutAnimationBatchItem {
  viewTag: number;
  type: LayoutAnimationType;
  config: SerializableRef<Keyframe | LayoutAnimationFunction> | undefined;
}

export type LayoutAnimationOrBuilder = (
  | BaseAnimationBuilder
  | typeof BaseAnimationBuilder
  | EntryExitAnimationFunction
  | Keyframe
  | ILayoutAnimationBuilder
) &
  LayoutAnimationStaticContext;

export type EntryOrExitLayoutType =
  | BaseAnimationBuilder
  | typeof BaseAnimationBuilder
  | EntryExitAnimationFunction
  | ReanimatedKeyframe;

export type LayoutAnimationStaticContext = {
  presetName: string;
};

export type LayoutProps = {
  /**
   * Lets you animate the layout changes when components are added to or removed
   * from the view hierarchy.
   *
   * You can use the predefined layout transitions (eg. `LinearTransition`,
   * `FadingTransition`) or create your own ones.
   *
   * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions
   */
  layout?:
    | BaseAnimationBuilder
    | LayoutAnimationFunction
    | typeof BaseAnimationBuilder;
  /**
   * Lets you animate an element when it's added to or removed from the view
   * hierarchy.
   *
   * You can use the predefined entering animations (eg. `FadeIn`,
   * `SlideInLeft`) or create your own ones.
   *
   * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations
   */
  entering?: EntryOrExitLayoutType;
  /**
   * Lets you animate an element when it's added to or removed from the view
   * hierarchy.
   *
   * You can use the predefined entering animations (eg. `FadeOut`,
   * `SlideOutRight`) or create your own ones.
   *
   * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations
   */
  exiting?: EntryOrExitLayoutType;
};

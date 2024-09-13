'use strict';
import type {
  ShareableRef,
  StyleProps,
  TransformArrayItem,
  EasingFunction,
} from '../../commonTypes';

export type LayoutAnimationsOptions =
  | 'originX'
  | 'originY'
  | 'width'
  | 'height'
  | 'borderRadius'
  | 'globalOriginX'
  | 'globalOriginY';

type CurrentLayoutAnimationsValues = {
  [K in LayoutAnimationsOptions as `current${Capitalize<string & K>}`]: number;
};

type TargetLayoutAnimationsValues = {
  [K in LayoutAnimationsOptions as `target${Capitalize<string & K>}`]: number;
};

interface WindowDimensions {
  windowWidth: number;
  windowHeight: number;
}

export interface KeyframeProps extends StyleProps {
  easing?: EasingFunction;
}

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

export type LayoutAnimation = {
  initialValues: StyleProps;
  animations: StyleProps;
  callback?: (finished: boolean) => void;
};

export type AnimationFunction = (a?: any, b?: any, c?: any) => any; // this is just a temporary mock

export type EntryAnimationsValues = TargetLayoutAnimationsValues &
  WindowDimensions;

export type ExitAnimationsValues = CurrentLayoutAnimationsValues &
  WindowDimensions;

export type EntryExitAnimationFunction =
  | ((targetValues: EntryAnimationsValues) => LayoutAnimation)
  | ((targetValues: ExitAnimationsValues) => LayoutAnimation)
  | (() => LayoutAnimation);

export type AnimationConfigFunction<T> = (targetValues: T) => LayoutAnimation;

export type LayoutAnimationsValues = CurrentLayoutAnimationsValues &
  TargetLayoutAnimationsValues &
  WindowDimensions;

export interface SharedTransitionAnimationsValues
  extends LayoutAnimationsValues {
  currentTransformMatrix: number[];
  targetTransformMatrix: number[];
}

export type SharedTransitionAnimationsFunction = (
  values: SharedTransitionAnimationsValues
) => LayoutAnimation;

export enum LayoutAnimationType {
  ENTERING = 1,
  EXITING = 2,
  LAYOUT = 3,
  SHARED_ELEMENT_TRANSITION = 4,
  SHARED_ELEMENT_TRANSITION_PROGRESS = 5,
}

export type LayoutAnimationFunction = (
  targetValues: LayoutAnimationsValues
) => LayoutAnimation;

export type LayoutAnimationStartFunction = (
  tag: number,
  type: LayoutAnimationType,
  yogaValues: Partial<SharedTransitionAnimationsValues>,
  config: (arg: Partial<SharedTransitionAnimationsValues>) => LayoutAnimation
) => void;

export interface ILayoutAnimationBuilder {
  build: () => LayoutAnimationFunction;
}

export interface BaseLayoutAnimationConfig {
  duration?: number;
  easing?: EasingFunction;
  type?: AnimationFunction;
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

export type ProgressAnimationCallback = (
  viewTag: number,
  progress: number
) => void;

export type ProgressAnimation = (
  viewTag: number,
  values: SharedTransitionAnimationsValues,
  progress: number
) => void;

export type CustomProgressAnimation = (
  values: SharedTransitionAnimationsValues,
  progress: number
) => StyleProps;

/**
 * Used to configure the `.defaultTransitionType()` shared transition modifier.
 *
 * @experimental
 */
export enum SharedTransitionType {
  ANIMATION = 'animation',
  PROGRESS_ANIMATION = 'progressAnimation',
}

export type EntryExitAnimationsValues =
  | EntryAnimationsValues
  | ExitAnimationsValues;

export type StylePropsWithArrayTransform = StyleProps & {
  transform?: TransformArrayItem[];
};

export interface LayoutAnimationBatchItem {
  viewTag: number;
  type: LayoutAnimationType;
  config:
    | ShareableRef<
        | Keyframe
        | LayoutAnimationFunction
        | SharedTransitionAnimationsFunction
        | ProgressAnimationCallback
      >
    | undefined;
  sharedTransitionTag?: string;
}

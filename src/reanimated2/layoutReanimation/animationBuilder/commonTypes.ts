import type { EasingFunction } from '../../Easing';
import type { StyleProps } from '../../commonTypes';

export interface KeyframeProps extends StyleProps {
  easing?: EasingFunction;
  [key: string]: any;
}

export type LayoutAnimation = {
  initialValues: StyleProps;
  animations: StyleProps;
  callback?: (finished: boolean) => void;
};

export type AnimationFunction = (a?: any, b?: any, c?: any) => any; // this is just a temporary mock

export interface EntryAnimationsValues {
  targetOriginX: number;
  targetOriginY: number;
  targetWidth: number;
  targetHeight: number;
  targetGlobalOriginX: number;
  targetGlobalOriginY: number;
  windowWidth: number;
  windowHeight: number;
}

export interface ExitAnimationsValues {
  currentOriginX: number;
  currentOriginY: number;
  currentWidth: number;
  currentHeight: number;
  currentGlobalOriginX: number;
  currentGlobalOriginY: number;
  windowWidth: number;
  windowHeight: number;
}

export type EntryExitAnimationFunction =
  | ((targetValues: EntryAnimationsValues) => LayoutAnimation)
  | ((targetValues: ExitAnimationsValues) => LayoutAnimation)
  | (() => LayoutAnimation);

export type AnimationConfigFunction<T> = (targetValues: T) => LayoutAnimation;

export interface LayoutAnimationsValues {
  [key: string]: number | number[];
  currentOriginX: number;
  currentOriginY: number;
  currentWidth: number;
  currentHeight: number;
  currentGlobalOriginX: number;
  currentGlobalOriginY: number;
  targetOriginX: number;
  targetOriginY: number;
  targetWidth: number;
  targetHeight: number;
  targetGlobalOriginX: number;
  targetGlobalOriginY: number;
  windowWidth: number;
  windowHeight: number;
}

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
  yogaValues: LayoutAnimationsValues,
  config: LayoutAnimationFunction
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
  BaseBuilderAnimationConfig
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

export enum SharedTransitionType {
  ANIMATION = 'animation',
  PROGRESS_ANIMATION = 'progressAnimation',
}

export type EntryExitAnimationsValues =
  | EntryAnimationsValues
  | ExitAnimationsValues;

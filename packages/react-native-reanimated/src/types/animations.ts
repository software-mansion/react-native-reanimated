'use strict';

export type Timestamp = number;

type Animatable = number | string | Array<number>;

export type AnimatableValueObject = { [key: string]: Animatable };

export type AnimatableValue = Animatable | AnimatableValueObject;

/**
 * A function called upon animation completion. If the animation is cancelled,
 * the callback will receive `false` as the argument; otherwise, it will receive
 * `true`.
 */
export type AnimationCallback = (
  finished?: boolean,
  current?: AnimatableValue
) => void;

export interface AnimationObject<T = AnimatableValue> {
  [key: string]: any;
  callback?: AnimationCallback;
  current?: T;
  toValue?: AnimationObject<T>['current'];
  startValue?: AnimationObject<T>['current'];
  finished?: boolean;
  strippedCurrent?: number;
  cancelled?: boolean;
  reduceMotion?: boolean;

  __prefix?: string;
  __suffix?: string;
  onFrame: (animation: any, timestamp: Timestamp) => boolean;
  onStart: (
    nextAnimation: any,
    current: any,
    timestamp: Timestamp,
    previousAnimation: any
  ) => void;
}

export interface Animation<T extends AnimationObject> extends AnimationObject {
  onFrame: (animation: T, timestamp: Timestamp) => boolean;
  onStart: (
    nextAnimation: T,
    current: AnimatableValue,
    timestamp: Timestamp,
    previousAnimation: Animation<any> | null | T
  ) => void;
}

/**
 * @param System - If the `Reduce motion` accessibility setting is enabled on
 *   the device, disable the animation. Otherwise, enable the animation.
 * @param Always - Disable the animation.
 * @param Never - Enable the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility
 */
export enum ReduceMotion {
  System = 'system',
  Always = 'always',
  Never = 'never',
}

export interface HigherOrderAnimation {
  isHigherOrder?: boolean;
}

export type NextAnimation<T extends AnimationObject> = T | (() => T);

export interface ClampAnimation
  extends Animation<ClampAnimation>,
    HigherOrderAnimation {
  current: AnimatableValue;
}

export interface DelayAnimation
  extends Animation<DelayAnimation>,
    HigherOrderAnimation {
  startTime: Timestamp;
  started: boolean;
  previousAnimation: DelayAnimation | null;
  current: AnimatableValue;
}

export interface RepeatAnimation
  extends Animation<RepeatAnimation>,
    HigherOrderAnimation {
  reps: number;
  startValue: AnimatableValue;
  toValue?: AnimatableValue;
  previousAnimation?: RepeatAnimation;
}

export interface SequenceAnimation
  extends Animation<SequenceAnimation>,
    HigherOrderAnimation {
  animationIndex: number;
}

// TODO - what the fuck is that?
export interface StyleLayoutAnimation extends HigherOrderAnimation {
  current: StyleProps;
  styleAnimations: AnimatedStyle<any>;
  onFrame: (animation: StyleLayoutAnimation, timestamp: Timestamp) => boolean;
  onStart: (
    nextAnimation: StyleLayoutAnimation,
    current: AnimatedStyle<any>,
    timestamp: Timestamp,
    previousAnimation: StyleLayoutAnimation
  ) => void;
  callback?: AnimationCallback;
}

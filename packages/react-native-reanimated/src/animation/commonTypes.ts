'use strict';
import type {
  AnimatableValue,
  AnimatedStyle,
  Animation,
  AnimationCallback,
  AnimationObject,
  StyleProps,
  Timestamp,
} from '../commonTypes';

export interface HigherOrderAnimation {
  isHigherOrder?: boolean;
}

export type NextAnimation<TAnimation extends AnimationObject> =
  | TAnimation
  | (() => TAnimation);

export interface ClampAnimation<
  TValue extends AnimatableValue = AnimatableValue,
>
  extends Animation<ClampAnimation<TValue>>, HigherOrderAnimation {
  current: TValue;
}

export interface DelayAnimation<
  TValue extends AnimatableValue = AnimatableValue,
>
  extends Animation<DelayAnimation<TValue>>, HigherOrderAnimation {
  startTime: Timestamp;
  started: boolean;
  previousAnimation: DelayAnimation<TValue> | null;
  current: TValue;
}

export interface RepeatAnimation<
  TValue extends AnimatableValue = AnimatableValue,
>
  extends Animation<RepeatAnimation<TValue>>, HigherOrderAnimation {
  reps: number;
  startValue: TValue;
  toValue?: TValue;
  previousAnimation?: RepeatAnimation<TValue>;
  current: TValue;
}

export interface SequenceAnimation<
  TValue extends AnimatableValue = AnimatableValue,
>
  extends Animation<SequenceAnimation<TValue>>, HigherOrderAnimation {
  animationIndex: number;
  current: TValue;
}

export interface StyleLayoutAnimation extends HigherOrderAnimation {
  current: StyleProps;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styleAnimations: AnimatedStyle<any>;
  onFrame: (animation: StyleLayoutAnimation, timestamp: Timestamp) => boolean;
  onStart: (
    nextAnimation: StyleLayoutAnimation,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    current: AnimatedStyle<any>,
    timestamp: Timestamp,
    previousAnimation: StyleLayoutAnimation
  ) => void;
  callback?: AnimationCallback;
}

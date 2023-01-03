import {
  AnimatedStyle,
  StyleProps,
  AnimatableValue,
  AnimationObject,
  Animation,
  Timestamp,
  AnimationCallback,
} from '../commonTypes';
import type { TimingAnimation } from './timing';
import type { SpringAnimation } from '.';

export interface HigherOrderAnimation {
  isHigherOrder?: boolean;
}

export type NextAnimation<T extends AnimationObject> = T | (() => T);

export interface DelayAnimation<T extends AnimatableValue>
  extends Animation<DelayAnimation<T>>,
    HigherOrderAnimation {
  startTime: Timestamp;
  started: boolean;
  previousAnimation: DelayAnimation<T> | null;
  current: T;
}

export interface RepeatAnimation<T extends AnimatableValue>
  extends Animation<RepeatAnimation<T>>,
    HigherOrderAnimation {
  reps: number;
  startValue: AnimatableValue;
  toValue?: AnimatableValue;
  previousAnimation?: RepeatAnimation<T>;
}

export interface SequenceAnimation
  extends Animation<SequenceAnimation>,
    HigherOrderAnimation {
  animationIndex: number;
}

export interface StyleLayoutAnimation extends HigherOrderAnimation {
  current: StyleProps;
  styleAnimations: AnimatedStyle;
  onFrame: (animation: StyleLayoutAnimation, timestamp: Timestamp) => boolean;
  onStart: (
    nextAnimation: StyleLayoutAnimation,
    current: AnimatedStyle,
    timestamp: Timestamp,
    previousAnimation: StyleLayoutAnimation
  ) => void;
  callback?: AnimationCallback;
}

export type InferAnimationReturnType<T extends AnimationObject> =
  T extends Animation<TimingAnimation<infer U>>
    ? U
    : T extends Animation<DelayAnimation<infer U>>
    ? U
    : T extends Animation<RepeatAnimation<infer U>>
    ? U
    : T extends Animation<SpringAnimation<infer U>>
    ? U
    : never;

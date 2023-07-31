import type {
  StyleProps,
  AnimatableValue,
  AnimationObject,
  Animation,
  Timestamp,
  AnimationCallback,
} from '../commonTypes';
import type { AnimatedStyle } from '../helperTypes';

export interface HigherOrderAnimation {
  isHigherOrder?: boolean;
}

export type NextAnimation<T extends AnimationObject> = T | (() => T);

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

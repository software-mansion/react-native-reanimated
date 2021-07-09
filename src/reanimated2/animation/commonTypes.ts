import { EasingFn } from '../Easing';
import { AnimatedStyle, StyleProps } from '../commonTypes';

export type PrimitiveValue = number | string;

export interface AnimationObject {
  callback: AnimationCallback;
  current?: PrimitiveValue;
  toValue?: AnimationObject['current'];
  startValue?: AnimationObject['current'];
  finished?: boolean;

  __prefix?: string;
  __suffix?: string;
}

export interface Animation<T extends AnimationObject> extends AnimationObject {
  onFrame: (animation: T, timestamp: Timestamp) => boolean;
  onStart: (
    nextAnimation: T,
    current: T extends NumericAnimation ? number : PrimitiveValue,
    timestamp: Timestamp,
    previousAnimation: T
  ) => void;
}

export interface NumericAnimation { current?: number; };
export interface HigherOrderAnimation { isHigherOrder?: boolean; };

export type AnimationCallback = (
  finished?: boolean,
  current?: PrimitiveValue
) => void;

export type NextAnimation<T extends AnimationObject> = T | (() => T);

export type SharedValue = {
  // TODO: just temporary mock
  value: unknown;
};

// export type AnimationOnFrame = (animation: Animation, now: number) => boolean;
export type Timestamp = number;

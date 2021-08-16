import { defineAnimation } from './util';
import {
  Timestamp,
  HigherOrderAnimation,
  AnimationCallback,
  AnimationObject,
} from './commonTypes';
import { AnimatedStyle, StyleProps, TransformProperty } from '../commonTypes';
import { withTiming } from './timing';

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

export function withStyleAnimation(
  styleAnimations: AnimatedStyle
): StyleLayoutAnimation {
  'worklet';
  return defineAnimation<StyleLayoutAnimation>({}, () => {
    'worklet';

    const onFrame = (
      animation: StyleLayoutAnimation,
      now: Timestamp
    ): boolean => {
      let stillGoing = false;
      Object.keys(styleAnimations).forEach((key) => {
        const currentAnimation = animation.styleAnimations[key];
        if (key === 'transform') {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const transform = animation.styleAnimations.transform!;
          for (let i = 0; i < transform.length; i++) {
            const type = Object.keys(transform[i])[0];
            const currentAnimation: AnimationObject = transform[i][type];
            if (currentAnimation.finished) {
              continue;
            }
            const finished = currentAnimation.onFrame(currentAnimation, now);
            if (finished) {
              currentAnimation.finished = true;
              if (currentAnimation.callback) {
                currentAnimation.callback(true);
              }
            } else {
              stillGoing = true;
            }
            // @ts-ignore: eslint-disable-line
            animation.current.transform[i][type] = currentAnimation.current;
          }
        } else {
          if (!currentAnimation.finished) {
            const finished = currentAnimation.onFrame(currentAnimation, now);
            if (finished) {
              currentAnimation.finished = true;
              if (currentAnimation.callback) {
                currentAnimation.callback(true);
              }
            } else {
              stillGoing = true;
            }
            animation.current[key] = currentAnimation.current;
          }
        }
      });
      return !stillGoing;
    };

    const onStart = (
      animation: StyleLayoutAnimation,
      value: AnimatedStyle,
      now: Timestamp,
      previousAnimation: StyleLayoutAnimation
    ): void => {
      Object.keys(styleAnimations).forEach((key) => {
        if (key === 'transform') {
          animation.current.transform = [];
          const transform = styleAnimations.transform as Array<AnimatedStyle>;
          const prevTransform = null;
          const valueTransform = value.transform as Array<AnimatedStyle>;
          let prevAnimation;
          if (
            previousAnimation &&
            previousAnimation.styleAnimations &&
            previousAnimation.styleAnimations.transform
          ) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            prevAnimation = previousAnimation.styleAnimations.transform;
          }
          for (let i = 0; i < transform.length; i++) {
            // duplication of code to avoid function calls
            let prevAnimation: AnimationObject | null = null;
            const type = Object.keys(transform[i])[0];
            if (prevTransform && (prevTransform as []).length > i) {
              const prevTransformStep = prevTransform[i];
              const prevType = Object.keys(prevTransformStep)[0];
              if (prevType === type) {
                prevAnimation = prevTransformStep[prevType];
              }
            }

            let prevVal = 0;
            if (prevAnimation != null) {
              prevVal = (prevAnimation as AnimationObject).current as number;
            }
            if (
              valueTransform != null &&
              valueTransform.length > i &&
              valueTransform[i][type]
            ) {
              prevVal = valueTransform[i][type];
            }

            const obj: { [key: string]: any } = {};
            obj[type] = prevVal;
            animation.current.transform[i] = obj as TransformProperty;
            let currentAnimation = transform[i][type];
            if (
              typeof currentAnimation !== 'object' &&
              !Array.isArray(currentAnimation)
            ) {
              currentAnimation = withTiming(currentAnimation, { duration: 0 });
              transform[i][type] = currentAnimation;
            }
            currentAnimation.onStart(
              currentAnimation,
              prevVal,
              now,
              prevAnimation
            );
          }
        } else {
          let prevAnimation = null;
          if (
            previousAnimation &&
            previousAnimation.styleAnimations &&
            previousAnimation.styleAnimations[key]
          ) {
            prevAnimation = previousAnimation.styleAnimations[key];
          }
          let prevVal = 0;
          if (prevAnimation != null) {
            prevVal = prevAnimation.current;
          }
          if (value[key]) {
            prevVal = value[key];
          }
          animation.current[key] = prevVal;
          let currentAnimation = animation.styleAnimations[key];
          if (
            typeof currentAnimation !== 'object' &&
            !Array.isArray(currentAnimation)
          ) {
            currentAnimation = withTiming(currentAnimation, { duration: 0 });
            animation.styleAnimations[key] = currentAnimation;
          }
          currentAnimation.onStart(
            currentAnimation,
            prevVal,
            now,
            prevAnimation
          );
        }
      });
    };

    const callback = (finished: boolean): void => {
      if (!finished) {
        Object.keys(styleAnimations).forEach((key) => {
          const currentAnimation = styleAnimations[key];
          if (key === 'transform') {
            const transform = styleAnimations.transform as Array<AnimatedStyle>;
            for (let i = 0; i < transform.length; i++) {
              const type = Object.keys(transform[i])[0];
              const currentAnimation = transform[i][type];
              if (currentAnimation.finished) {
                continue;
              }
              if (currentAnimation.callback) {
                currentAnimation.callback(false);
              }
            }
          } else {
            if (!currentAnimation.finished) {
              if (currentAnimation.callback) {
                currentAnimation.callback(false);
              }
            }
          }
        });
      }
    };

    return {
      isHigherOrder: true,
      onFrame,
      onStart,
      current: {},
      styleAnimations,
      callback,
    } as StyleLayoutAnimation;
  });
}

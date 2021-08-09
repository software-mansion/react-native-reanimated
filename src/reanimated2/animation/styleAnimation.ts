import { defineAnimation } from './util';
import {
  Timestamp,
  HigherOrderAnimation,
  AnimationCallback,
} from './commonTypes';
import { AnimatedStyle, StyleProps } from '../commonTypes';
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

// resolves path to value for nested objects
function resolvePath(obj, path) {
  'worklet';
  const keys = Array.isArray(path) ? path : [path];
  return keys.reduce((previous, current) => {
    if (previous) {
      return previous[current];
    }
    return undefined;
  }, obj);
}

// set value at given path
function setPath(obj, path, value) {
  'worklet';
  const keys = Array.isArray(path) ? path : [path];
  let currObj = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    // creates entry if there isn't one
    if (!currObj[keys[i]]) {
      // if next key is a number create an array
      if (typeof keys[i + 1] === 'number') {
        currObj[keys[i]] = [];
      } else {
        currObj[keys[i]] = {};
      }
    }
    currObj = currObj[keys[i]];
  }

  currObj[keys[keys.length - 1]] = value;
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
      const onFrameRecursive = (currentStyleAnimation, currentPath): void => {
        if (currentStyleAnimation.onFrame !== undefined) {
          if (currentStyleAnimation.finished) {
            return;
          }
          const finished = currentStyleAnimation.onFrame(
            currentStyleAnimation,
            now
          );
          if (finished) {
            currentStyleAnimation.finished = true;
            if (currentStyleAnimation.callback) {
              currentStyleAnimation.callback(true);
            }
          } else {
            stillGoing = true;
          }
          setPath(
            animation.current,
            currentPath,
            currentStyleAnimation.current
          );
        } else if (typeof styleAnimations === 'object') {
          // nested object
          Object.keys(currentStyleAnimation).forEach((key) => {
            onFrameRecursive(currentStyleAnimation[key], [...currentPath, key]);
          });
        } else if (Array.isArray(currentStyleAnimation)) {
          currentStyleAnimation.forEach((element, index) =>
            onFrameRecursive(element, [...currentPath, index])
          );
        }
      };
      onFrameRecursive(animation.styleAnimations, []);
      return !stillGoing;
    };

    const onStart = (
      animation: StyleLayoutAnimation,
      value: AnimatedStyle,
      now: Timestamp,
      previousAnimation: StyleLayoutAnimation
    ): void => {
      const onStartRecursive = (currentStyleAnimation, currentPath) => {
        if (Array.isArray(currentStyleAnimation)) {
          currentStyleAnimation.forEach((element, index) =>
            onStartRecursive(element, [...currentPath, index])
          );
        } else if (
          typeof currentStyleAnimation === 'object' &&
          currentStyleAnimation.onStart === undefined
        ) {
          Object.keys(currentStyleAnimation).forEach((key) =>
            onStartRecursive(currentStyleAnimation[key], [...currentPath, key])
          );
        } else {
          const prevAnimation = resolvePath(
            previousAnimation?.styleAnimations,
            currentPath
          );
          let prevVal = resolvePath(value, currentPath);
          if (prevAnimation && !prevVal) {
            prevVal = prevAnimation.current;
          }
          setPath(animation.current, currentPath, prevVal);
          let currentAnimation = currentStyleAnimation;
          if (!currentAnimation.onStart) {
            currentAnimation = withTiming(currentAnimation, { duration: 0 });
            setPath(animation.styleAnimations, currentPath, currentAnimation);
          }
          currentAnimation.onStart(
            currentAnimation,
            prevVal,
            now,
            prevAnimation
          );
        }
      };
      onStartRecursive(styleAnimations, []);
    };

    const callback = (finished: boolean): void => {
      const recursiveCallback = (currentStyleAnimation) => {
        if (currentStyleAnimation.onFrame) {
          if (
            !currentStyleAnimation.finished &&
            currentStyleAnimation.callback
          ) {
            currentStyleAnimation.callback(false);
          }
        } else if (Array.isArray(currentStyleAnimation)) {
          currentStyleAnimation.forEach((element) =>
            recursiveCallback(element)
          );
        } else if (typeof currentStyleAnimation === 'object') {
          Object.values(currentStyleAnimation).forEach((value) =>
            recursiveCallback(value)
          );
        }
      };
      if (!finished) {
        recursiveCallback(styleAnimations);
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

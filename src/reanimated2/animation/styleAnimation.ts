import { defineAnimation } from './util';
import {
  Timestamp,
  HigherOrderAnimation,
  AnimationCallback,
  PrimitiveValue,
  AnimationObject,
  Animation,
} from './commonTypes';
import {
  AnimatedStyle,
  NestedObject,
  NestedObjectValues,
  StyleProps,
} from '../commonTypes';
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
// if path cannot be resolved returns undefined
function resolvePath<T>(
  obj: NestedObject<T>,
  path: PrimitiveValue[] | PrimitiveValue
): NestedObjectValues<T> | undefined {
  'worklet';
  const keys: PrimitiveValue[] = Array.isArray(path) ? path : [path];
  return keys.reduce<NestedObjectValues<T> | undefined>((acc, current) => {
    if (Array.isArray(acc) && typeof current === 'number') {
      return acc[current];
    } else if (typeof acc === 'object' && current in acc) {
      return (acc as { [key: string]: NestedObjectValues<T> })[current];
    }
    return undefined;
  }, obj);
}

// set value at given path
function setPath<T>(
  obj: NestedObject<T>,
  path: PrimitiveValue[] | PrimitiveValue,
  value: NestedObjectValues<T>
) {
  'worklet';
  const keys: PrimitiveValue[] = Array.isArray(path) ? path : [path];
  let currObj: NestedObjectValues<T> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    // creates entry if there isn't one
    currObj = currObj as { [key: string]: NestedObjectValues<T> };
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

  (currObj as { [key: string]: NestedObjectValues<T> })[
    keys[keys.length - 1]
  ] = value;
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
      const onFrameRecursive = (
        currentStyleAnimation: NestedObjectValues<AnimationObject>,
        currentPath: PrimitiveValue[]
      ): void => {
        if (Array.isArray(currentStyleAnimation)) {
          for (let index = 0; index < currentStyleAnimation.length; index++) {
            onFrameRecursive(
              currentStyleAnimation[index],
              currentPath.concat(index)
            );
          }
        } else if (
          typeof currentStyleAnimation === 'object' &&
          currentStyleAnimation.onFrame === undefined
        ) {
          // nested object
          for (const key of Object.keys(currentStyleAnimation)) {
            onFrameRecursive(
              currentStyleAnimation[key],
              currentPath.concat(key)
            );
          }
        } else {
          const currentAnimation: AnimationObject = currentStyleAnimation as AnimationObject;
          if (currentAnimation.finished) {
            return;
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
          setPath(animation.current, currentPath, currentAnimation.current);
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
      const onStartRecursive = (
        currentStyleAnimation: NestedObjectValues<
          AnimationObject | PrimitiveValue
        >,
        currentPath: PrimitiveValue[]
      ) => {
        if (Array.isArray(currentStyleAnimation)) {
          for (let index = 0; index < currentStyleAnimation.length; index++) {
            onStartRecursive(
              currentStyleAnimation[index],
              currentPath.concat(index)
            );
          }
        } else if (
          typeof currentStyleAnimation === 'object' &&
          currentStyleAnimation.onStart === undefined
        ) {
          for (const key of Object.keys(currentStyleAnimation)) {
            onStartRecursive(
              currentStyleAnimation[key],
              currentPath.concat(key)
            );
          }
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
          let currentAnimation: AnimationObject;
          if (
            typeof currentStyleAnimation !== 'object' ||
            !currentStyleAnimation.onStart
          ) {
            currentAnimation = withTiming(
              currentStyleAnimation as PrimitiveValue,
              { duration: 0 }
            );
            setPath(animation.styleAnimations, currentPath, currentAnimation);
          } else {
            currentAnimation = currentStyleAnimation as Animation<AnimationObject>;
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
      const recursiveCallback = (
        currentStyleAnimation: NestedObjectValues<AnimationObject>
      ) => {
        if (Array.isArray(currentStyleAnimation)) {
          for (const element of currentStyleAnimation) {
            recursiveCallback(element);
          }
        } else if (
          typeof currentStyleAnimation === 'object' &&
          currentStyleAnimation.onStart === undefined
        ) {
          for (const value of Object.values(currentStyleAnimation)) {
            recursiveCallback(value);
          }
        } else {
          const currentAnimation: AnimationObject = currentStyleAnimation as AnimationObject;
          if (!currentAnimation.finished && currentAnimation.callback) {
            currentAnimation.callback(false);
          }
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

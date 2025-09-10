'use strict';

import { ColorProperties } from "../Colors.js";
import { logger, processColor } from "../common/index.js";
import { withTiming } from "./timing.js";
import { defineAnimation, isValidLayoutAnimationProp } from "./util.js";

// resolves path to value for nested objects
// if path cannot be resolved returns undefined
function resolvePath(obj, path) {
  'worklet';

  const keys = Array.isArray(path) ? path : [path];
  return keys.reduce((acc, current) => {
    if (Array.isArray(acc) && typeof current === 'number') {
      return acc[current];
    } else if (acc !== null && typeof acc === 'object' && current in acc) {
      return acc[current];
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
    currObj = currObj;
    if (!(keys[i] in currObj)) {
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
export function withStyleAnimation(styleAnimations) {
  'worklet';

  return defineAnimation({}, () => {
    'worklet';

    const onFrame = (animation, now) => {
      let stillGoing = false;
      const entriesToCheck = [{
        value: animation.styleAnimations,
        path: []
      }];
      while (entriesToCheck.length > 0) {
        const currentEntry = entriesToCheck.pop();
        if (Array.isArray(currentEntry.value)) {
          for (let index = 0; index < currentEntry.value.length; index++) {
            entriesToCheck.push({
              value: currentEntry.value[index],
              path: currentEntry.path.concat(index)
            });
          }
        } else if (typeof currentEntry.value === 'object' && currentEntry.value.onFrame === undefined) {
          // nested object
          for (const key of Object.keys(currentEntry.value)) {
            entriesToCheck.push({
              value: currentEntry.value[key],
              path: currentEntry.path.concat(key)
            });
          }
        } else {
          const currentStyleAnimation = currentEntry.value;
          if (currentStyleAnimation.finished) {
            continue;
          }
          const finished = currentStyleAnimation.onFrame(currentStyleAnimation, now);
          if (finished) {
            currentStyleAnimation.finished = true;
            if (currentStyleAnimation.callback) {
              currentStyleAnimation.callback(true);
            }
          } else {
            stillGoing = true;
          }

          // When working with animations changing colors, we need to make sure that each one of them begins with a rgba, not a processed number.
          // Thus, we only set the path to a processed color, but currentStyleAnimation.current stays as rgba.
          const isAnimatingColorProp = ColorProperties.includes(currentEntry.path[0]);
          setPath(animation.current, currentEntry.path, isAnimatingColorProp ? processColor(currentStyleAnimation.current) : currentStyleAnimation.current);
        }
      }
      return !stillGoing;
    };
    const onStart = (animation, value, now, previousAnimation) => {
      const entriesToCheck = [{
        value: styleAnimations,
        path: []
      }];
      while (entriesToCheck.length > 0) {
        const currentEntry = entriesToCheck.pop();
        if (Array.isArray(currentEntry.value)) {
          for (let index = 0; index < currentEntry.value.length; index++) {
            entriesToCheck.push({
              value: currentEntry.value[index],
              path: currentEntry.path.concat(index)
            });
          }
        } else if (typeof currentEntry.value === 'object' && currentEntry.value.onStart === undefined) {
          for (const key of Object.keys(currentEntry.value)) {
            entriesToCheck.push({
              value: currentEntry.value[key],
              path: currentEntry.path.concat(key)
            });
          }
        } else {
          const prevAnimation = resolvePath(previousAnimation?.styleAnimations, currentEntry.path);
          let prevVal = resolvePath(value, currentEntry.path);
          if (prevAnimation && !prevVal) {
            prevVal = prevAnimation.current;
          }
          if (__DEV__) {
            if (prevVal === undefined) {
              logger.warn(`Initial values for animation are missing for property ${currentEntry.path.join('.')}`);
            }
            const propName = currentEntry.path[0];
            if (typeof propName === 'string' && !isValidLayoutAnimationProp(propName.trim())) {
              logger.warn(`'${propName}' property is not officially supported for layout animations. It may not work as expected.`);
            }
          }
          setPath(animation.current, currentEntry.path, prevVal);
          let currentAnimation;
          if (typeof currentEntry.value !== 'object' || !currentEntry.value.onStart) {
            currentAnimation = withTiming(currentEntry.value, {
              duration: 0
            }); // TODO TYPESCRIPT this temporary cast is to get rid of .d.ts file.
            setPath(animation.styleAnimations, currentEntry.path, currentAnimation);
          } else {
            currentAnimation = currentEntry.value;
          }
          currentAnimation.onStart(currentAnimation, prevVal, now, prevAnimation);
        }
      }
    };
    const callback = finished => {
      if (!finished) {
        const animationsToCheck = [styleAnimations];
        while (animationsToCheck.length > 0) {
          const currentAnimation = animationsToCheck.pop();
          if (Array.isArray(currentAnimation)) {
            for (const element of currentAnimation) {
              animationsToCheck.push(element);
            }
          } else if (typeof currentAnimation === 'object' && currentAnimation.onStart === undefined) {
            for (const value of Object.values(currentAnimation)) {
              animationsToCheck.push(value);
            }
          } else {
            const currentStyleAnimation = currentAnimation;
            if (!currentStyleAnimation.finished && currentStyleAnimation.callback) {
              currentStyleAnimation.callback(false);
            }
          }
        }
      }
    };
    return {
      isHigherOrder: true,
      onFrame,
      onStart,
      current: {},
      styleAnimations,
      callback
    };
  });
}
//# sourceMappingURL=styleAnimation.js.map
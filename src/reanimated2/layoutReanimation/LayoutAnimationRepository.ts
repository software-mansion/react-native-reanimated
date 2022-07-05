/* global _stopObservingProgress, _startObservingProgress */
import { runOnUI } from '../core';
import { withStyleAnimation } from '../animation/styleAnimation';
import { ColorProperties } from '../UpdateProps';
import { processColor } from '../Colors';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['Overriding previous layout animation with']);

runOnUI(() => {
  'worklet';

  const enteringAnimationForTag: Record<string, any> = {};

  global.LayoutAnimationRepository = {
    startAnimationForTag(tag, type, yogaValues, config, viewSharedValue) {
      const style = config(yogaValues);
      let currentAnimation = style.animations;

      if (type === 'entering') {
        enteringAnimationForTag[tag] = currentAnimation;
      } else if (type === 'layout') {
        // When layout animaiton is requested, but entering is still running, we merge
        // new layout animation targets into the ongoing animation
        const enteringAnimation = enteringAnimationForTag[tag];
        if (enteringAnimation) {
          currentAnimation = { ...enteringAnimation, ...style.animations };
        }
      }

      _stopObservingProgress(tag, false);

      const backupColor: Record<string, string> = {};
      for (const key in style.initialValues) {
        if (ColorProperties.includes(key)) {
          const value = style.initialValues[key];
          backupColor[key] = value;
          style.initialValues[key] = processColor(value);
        }
      }

      viewSharedValue.value = Object.assign(
        {},
        viewSharedValue._value,
        style.initialValues
      );
      const animation = withStyleAnimation(currentAnimation);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          delete enteringAnimationForTag[tag];
          _stopObservingProgress(tag, finished);
        }
        style.callback && style.callback(finished);
      };

      // TODO: fix color animations
      // if (backupColor) {
      //   viewSharedValue._value = { ...viewSharedValue.value, ...backupColor };
      // }

      viewSharedValue.value = animation;
      _startObservingProgress(tag, viewSharedValue);
    },
  };
})();

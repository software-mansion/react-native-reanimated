/* global _stopObservingProgress, _startObservingProgress */
import { runOnUI } from '../core';
import { withStyleAnimation } from '../animation/styleAnimation';
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
        // When layout animation is requested, but entering is still running, we merge
        // new layout animation targets into the ongoing animation
        const enteringAnimation = enteringAnimationForTag[tag];
        if (enteringAnimation) {
          currentAnimation = { ...enteringAnimation, ...style.animations };
        }
      }
      _stopObservingProgress(tag, false, false);
      viewSharedValue._value = Object.assign(
        {},
        viewSharedValue._value,
        style.initialValues
      );
      const animation = withStyleAnimation(currentAnimation);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          delete enteringAnimationForTag[tag];
          const shouldRemoveView = type === 'exiting';
          _stopObservingProgress(tag, finished, shouldRemoveView);
        }
        style.callback && style.callback(finished);
      };

      viewSharedValue.value = animation;
      _startObservingProgress(tag, viewSharedValue, type);
    },
  };
})();

/* global _stopObservingProgress, _startObservingProgress */
import { runOnUI } from '../core';
import { withStyleAnimation } from '../animation/styleAnimation';
import { ColorProperties } from '../UpdateProps';
import { processColor } from '../Colors';

runOnUI(() => {
  'worklet';
  const configs: Record<string, any> = {};

  global.LayoutAnimationRepository = {
    configs,
    startAnimationForTag(tag, type, yogaValues, config, viewSharedValue) {
      const style = config(yogaValues);
      let currentAnimation = style.animations;

      _stopObservingProgress(tag, false);

      const backupColor: Record<string, string> = {};
      for (const key in style.initialValues) {
        if (ColorProperties.includes(key)) {
          const value = style.initialValues[key];
          backupColor[key] = value;
          style.initialValues[key] = processColor(value);
        }
      }

      viewSharedValue.value = Object.assign({}, viewSharedValue._value, style.initialValues);
      const animation = withStyleAnimation(currentAnimation);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          _stopObservingProgress(tag, finished);
        }
        style.callback && style.callback(finished);
      };

      // TODO: not sure why this one is here? need to check bg colors
      // if (backupColor) {
      //   configs[tag].sv._value = { ...configs[tag].sv.value, ...backupColor };
      // }

      viewSharedValue.value = animation;
      _startObservingProgress(tag, viewSharedValue);
    },
  };
})();

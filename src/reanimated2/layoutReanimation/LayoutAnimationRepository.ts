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
    startAnimationForTag(tag, type, yogaValues, config) {
      console.log("START ANIMATION FOR TAG", tag);
      // if (configs[tag] == null) {
      //   console.log("NO ANIMATION FOR", tag);
      //   return; // :(
      // }
      const style = config(yogaValues);
      let currentAnimation = style.animations;
      // if (type === 'entering') {
      //   enteringAnimationForTag[tag] = style;
      // } else if (type === 'layout' && enteringAnimationForTag[tag] !== null) {
      //   const entryAniamtion = enteringAnimationForTag[tag].animations;
      //   const layoutAnimation = style.animations;
      //   currentAnimation = {};
      //   for (const key in entryAniamtion) {
      //     currentAnimation[key] = entryAniamtion[key];
      //   }
      //   for (const key in layoutAnimation) {
      //     currentAnimation[key] = layoutAnimation[key];
      //   }
      // }

      console.log("Hello");
      const sv: { value: boolean; _value: boolean } = config.sv;
      console.log("Hello2");
      _stopObservingProgress(tag, false);
      console.log("Hello3");
      _startObservingProgress(tag, sv);
      console.log("Hello4");

      const backupColor: Record<string, string> = {};
      for (const key in style.initialValues) {
        if (ColorProperties.includes(key)) {
          const value = style.initialValues[key];
          backupColor[key] = value;
          style.initialValues[key] = processColor(value);
        }
      }

      sv.value = Object.assign({}, sv._value, style.initialValues);
      _stopObservingProgress(tag, false);
      const animation = withStyleAnimation(currentAnimation);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          _stopObservingProgress(tag, finished);
        }
        style.callback && style.callback(finished);
      };

      // if (backupColor) {
      //   configs[tag].sv._value = { ...configs[tag].sv.value, ...backupColor };
      // }

      sv.value = animation;
      _startObservingProgress(tag, sv);
    },
  };
})();

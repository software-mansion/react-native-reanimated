/* global _stopObservingProgress, _startObservingProgress */
import { runOnUI } from '../core';
import { withStyleAnimation } from '../animation/styleAnimation';

runOnUI(() => {
  'worklet';

  const configs: Record<string, any> = {};
  const enteringAnimationForTag: Record<string, any> = {};

  global.LayoutAnimationRepository = {
    configs,
    registerConfig(tag, config) {
      configs[tag] = config;
      enteringAnimationForTag[tag] = null;
    },
    removeConfig(tag) {
      delete configs[tag];
      delete enteringAnimationForTag[tag];
    },
    startAnimationForTag(tag, type, yogaValues) {
      if (configs[tag] == null) {
        return; // :(
      }
      const style = configs[tag][type](yogaValues);
      let currentAnimation = style.animations;
      if (type === 'entering') {
        enteringAnimationForTag[tag] = style;
      } else if (type === 'layout' && enteringAnimationForTag[tag] !== null) {
        const entryAniamtion = enteringAnimationForTag[tag].animations;
        const layoutAnimation = style.animations;
        currentAnimation = {};
        for (const key in entryAniamtion) {
          currentAnimation[key] = entryAniamtion[key];
        }
        for (const key in layoutAnimation) {
          currentAnimation[key] = layoutAnimation[key];
        }
        enteringAnimationForTag[tag] = null;
      }

      const sv: { value: boolean; _value: boolean } = configs[tag].sv;
      _stopObservingProgress(tag, false);
      _startObservingProgress(tag, sv);
      sv._value = Object.assign({}, sv._value, style.initialValues);
      _stopObservingProgress(tag, false);
      const animation = withStyleAnimation(currentAnimation);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          _stopObservingProgress(tag, finished);
        }
        style.callback && style.callback(finished);
        if (type === 'entering') {
          enteringAnimationForTag[tag] = null;
        }
      };
      configs[tag].sv.value = animation;
      _startObservingProgress(tag, sv);
    },
  };
})();

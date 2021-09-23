/* global _stopObservingProgress, _startObservingProgress */
import { runOnUI } from '../core';
import { withStyleAnimation } from '../animation/styleAnimation';

runOnUI(() => {
  'worklet';

  const configs: Record<string, any> = {};
  const enteringAniamtionForTag: Record<string, any> = {};

  global.LayoutAnimationRepository = {
    configs,
    registerConfig(tag, config) {
      configs[tag] = config;
      enteringAniamtionForTag[tag] = null;
    },
    removeConfig(tag) {
      delete configs[tag];
      delete enteringAniamtionForTag[tag];
    },
    startAnimationForTag(tag, type, yogaValues) {
      if (configs[tag] == null) {
        return; // :(
      }
      const style = configs[tag][type](yogaValues);
      let currentAniamtion = style.animations;
      if (type === 'entering') {
        enteringAniamtionForTag[tag] = style;
      } else if (type === 'layout') {
        const entryAniamtion = enteringAniamtionForTag[tag].animations;
        const layoutAnimation = style.animations;
        currentAniamtion = {};
        for (const key in entryAniamtion) {
          currentAniamtion[key] = entryAniamtion[key];
        }
        for (const key in layoutAnimation) {
          currentAniamtion[key] = layoutAnimation[key];
        }
      }

      const sv: { value: boolean; _value: boolean } = configs[tag].sv;
      _stopObservingProgress(tag, false);
      _startObservingProgress(tag, sv);
      sv._value = Object.assign({}, style.initialValues, sv._value);
      _stopObservingProgress(tag, false);
      const animation = withStyleAnimation(currentAniamtion);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          _stopObservingProgress(tag, finished);
        }
        style.callback && style.callback(finished);
      };
      configs[tag].sv.value = animation;
      _startObservingProgress(tag, sv);
    },
  };
})();

/* global _stopObservingProgress, _startObservingProgress */
import { runOnUI } from '../core';
import { withStyleAnimation } from '../animation/styleAnimation';
import { unstable_enableLogBox } from 'react-native';

runOnUI(() => {
  'worklet';

  const configs: Record<string, any> = {};

  global.LayoutAnimationRepository = {
    configs,
    registerConfig(tag, config) {
      configs[tag] = config;
      _log("register " + tag);
    },
    removeConfig(tag) {
      delete configs[tag];
    },
    startAnimationForTag(tag, type, yogaValues) {
      if (configs[tag] == null) {
        _log("fail " + tag);
        return; // :(
      }

      /*if (typeof configs[tag][type] !== 'function') {
        console.error(`${type} animation for a tag: ${tag} it not a function!`);
      }*/
      const style = configs[tag][type](yogaValues);
      const sv: { value: boolean; _value: boolean } = configs[tag].sv;
      _stopObservingProgress(tag, false);
      _startObservingProgress(tag, sv);
      sv._value = Object.assign({}, sv._value, style.initialValues);
      _stopObservingProgress(tag, false);
      const animation = withStyleAnimation(style.animations);

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

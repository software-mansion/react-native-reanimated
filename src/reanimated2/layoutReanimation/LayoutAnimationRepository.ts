import { runOnUI } from '../core';
import { withStyleAnimation } from '../animation/styleAnimation';
import { ColorProperties } from '../UpdateProps';
import { processColor } from '../Colors';
import { SharedValue } from '../commonTypes';

const TAG_OFFSET = 1e9;

function startObservingProgress(
  tag: number,
  sharedValue: SharedValue<number>
): void {
  'worklet';
  sharedValue.addListener(tag + TAG_OFFSET, () => {
    _notifyAboutProgress(tag, sharedValue.value);
  });
}

function stopObservingProgress(
  tag: number,
  sharedValue: SharedValue<number>,
  finished: boolean
): void {
  'worklet';
  sharedValue.removeListener(tag + TAG_OFFSET);
  _notifyAboutEnd(tag, finished);
}

runOnUI(() => {
  'worklet';

  const configs: Record<string, any> = Object.create(null);
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
      }

      const sv: { value: boolean; _value: boolean } = configs[tag].sv;
      stopObservingProgress(tag, sv, false);
      startObservingProgress(tag, sv);

      const backupColor: Record<string, string> = {};
      for (const key in style.initialValues) {
        if (ColorProperties.includes(key)) {
          const value = style.initialValues[key];
          backupColor[key] = value;
          style.initialValues[key] = processColor(value);
        }
      }

      sv.value = Object.assign({}, sv._value, style.initialValues);
      stopObservingProgress(tag, sv, false);
      const animation = withStyleAnimation(currentAnimation);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          stopObservingProgress(tag, sv, finished);
        }
        style.callback && style.callback(finished);
      };

      if (backupColor) {
        configs[tag].sv._value = { ...configs[tag].sv.value, ...backupColor };
      }

      configs[tag].sv.value = animation;
      startObservingProgress(tag, sv);
    },
  };
})();

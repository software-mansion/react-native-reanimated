/* global _stopObservingProgress, _startObservingProgress */
import { runOnUI } from '../core';
import { withStyleAnimation } from '../animation/styleAnimation';
import { ColorProperties } from '../UpdateProps';
import { processColor } from '../Colors';
import { Component } from 'react';
import { Platform } from 'react-native';

runOnUI(() => {
  'worklet';

  const configs: Record<string, any> = {};
  const refList: (Component<any, any> | null)[] = [];
  const enteringAnimationForTag: Record<string, any> = {};

  global.LayoutAnimationRepository = {
    configs,
    refList,
    registerConfig(tag, config) {
      configs[tag] = config;
      enteringAnimationForTag[tag] = null;
    },
    registerWebConfig(ref, config) {
      const tag = refList.length;
      refList.push(ref);
      this.registerConfig(tag, config);
    },
    removeConfig(tag) {
      if (refList[tag]) {
        refList[tag] = null;
      }
      delete configs[tag];
      delete enteringAnimationForTag[tag];
    },
    startAnimationForWeb(ref, type, yogaValues) {
      const tag = refList.findIndex((item) => item === ref);
      if (tag > -1) {
        this.startAnimationForTag(tag, type, yogaValues);
      }
    },
    startAnimationForTag(tag, type, yogaValues) {
      if (Platform.OS === 'web' && refList[tag] == null) {
        return;
      }

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

      if (Platform.OS !== 'web') {
        _stopObservingProgress(tag, false);
        _startObservingProgress(tag, sv);
      }

      const backupColor: Record<string, string> = {};
      for (const key in style.initialValues) {
        if (ColorProperties.includes(key)) {
          const value = style.initialValues[key];
          backupColor[key] = value;
          style.initialValues[key] = processColor(value);
        }
      }

      // setting up initial styles
      sv.value = Object.assign({}, sv._value, style.initialValues);

      if (Platform.OS !== 'web') {
        _stopObservingProgress(tag, false);
      }

      const animation = withStyleAnimation(currentAnimation);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          if (Platform.OS !== 'web') {
            _stopObservingProgress(tag, finished);
          }
        }
        style.callback && style.callback(finished);
      };

      if (backupColor) {
        configs[tag].sv._value = { ...configs[tag].sv.value, ...backupColor };
      }

      // trigger the animation
      configs[tag].sv.value = animation;

      if (Platform.OS !== 'web') {
        _startObservingProgress(tag, sv);
      }
    },
  };
})();

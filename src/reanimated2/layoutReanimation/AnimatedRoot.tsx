/* global _stopObservingProgress, _startObservingProgress */
import { Platform, requireNativeComponent } from 'react-native';
import React from 'react';
import { runOnUI } from '../core';
import { withStyleAnimation } from '../animations';

let REALayoutView: any;
if (Platform.OS === 'web' && !requireNativeComponent) {
  REALayoutView = React.Component;
} else {
  REALayoutView = (requireNativeComponent(
    'REALayoutView'
  ) as unknown) as React.Component;
}

export class AnimatedLayout extends React.Component {
  render(): React.ReactElement {
    return <REALayoutView collapsable={false} {...this.props} />;
  }
}

// Register LayoutAnimationRepository

runOnUI(() => {
  'worklet';

  const configs: Record<string, any> = {};

  /* 
    withStyleAnimation requires the same order of object in `animation.transform` as in `initialValues.transform`
  */
  const sortInitialValues = (style) => {
    if (!style.animations.transform || style.animations.transform.length <= 1) {
      return;
    }

    const transformKeysOrder = [];
    for (const transformObject of style.animations.transform) {
      transformKeysOrder.push(Object.keys(transformObject)[0]);
    }

    const transformByKey = {};
    for (const transformObject of style.initialValues.transform) {
      const key = Object.keys(transformObject)[0];
      transformByKey[key] = transformObject;
    }

    const transformInitialValues = [];
    for (const key of transformKeysOrder) {
      transformInitialValues.push(transformByKey[key]);
    }

    style.initialValues.transform = transformInitialValues;
  };

  global.LayoutAnimationRepository = {
    configs,
    registerConfig(tag, config) {
      configs[tag] = config;
    },
    removeConfig(tag) {
      delete configs[tag];
    },
    startAnimationForTag(tag, type, yogaValues) {
      if (configs[tag] == null) {
        return; // :(
      }

      if (typeof configs[tag][type] !== 'function') {
        console.error(`${type} animation for a tag: ${tag} it not a function!`);
      }

      const style = configs[tag][type](yogaValues);
      sortInitialValues(style);
      const sv: { value: boolean; _value: boolean } = configs[tag].sv;
      _stopObservingProgress(tag, false);
      _startObservingProgress(tag, sv);
      sv._value = Object.assign({}, sv._value, style.initialValues);
      _stopObservingProgress(tag, false);
      const animation = withStyleAnimation(style.animations);

      animation.callback = (finished: boolean) => {
        if (finished) {
          _stopObservingProgress(tag, finished);
        }
      };
      configs[tag].sv.value = animation;
      _startObservingProgress(tag, sv);
    },
  };
})();

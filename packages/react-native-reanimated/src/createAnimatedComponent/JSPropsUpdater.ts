'use strict';
import { runOnJS, runOnUI } from 'react-native-worklets';

import { SHOULD_BE_USE_WEB } from '../common';
import type {
  AnimatedComponentProps,
  IAnimatedComponentInternal,
  IJSPropsUpdater,
  InitialComponentProps,
} from './commonTypes';

class JSPropsUpdaterNative implements IJSPropsUpdater {
  private static _tagToComponentMapping = new Map();
  private static isInitialized = false;

  constructor() {
    if (!JSPropsUpdaterNative.isInitialized) {
      const updater = (viewTag: number, props: unknown) => {
        const component =
          JSPropsUpdaterNative._tagToComponentMapping.get(viewTag);
        component?._updateFromNative(props);
      };
      runOnUI(() => {
        'worklet';
        global.updateJSProps = (viewTag: number, props: unknown) => {
          // console.log(viewTag, props);
          runOnJS(updater)(viewTag, props);
        };
      })();
      JSPropsUpdaterNative.isInitialized = true;
    }
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    if (!JSPropsUpdaterNative.isInitialized) {
      return;
    }
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.set(viewTag, animatedComponent);
  }

  public removeOnJSPropsChangeListener(
    animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    if (!JSPropsUpdaterNative.isInitialized) {
      return;
    }
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.delete(viewTag);
  }
}

class JSPropsUpdaterWeb implements IJSPropsUpdater {
  public addOnJSPropsChangeListener(
    _animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    // noop
  }

  public removeOnJSPropsChangeListener(
    _animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    // noop
  }
}

type JSPropsUpdaterOptions =
  | typeof JSPropsUpdaterWeb
  | typeof JSPropsUpdaterNative;

let JSPropsUpdater: JSPropsUpdaterOptions;
if (SHOULD_BE_USE_WEB) {
  JSPropsUpdater = JSPropsUpdaterWeb;
} else {
  JSPropsUpdater = JSPropsUpdaterNative;
}

export default JSPropsUpdater;

'use strict';
import {
  NativeEventEmitter,
  NativeModules,
  findNodeHandle,
} from 'react-native';
import { shouldBeUseWeb } from '../reanimated2/PlatformChecker';
import type { StyleProps } from '../reanimated2';
import { runOnJS, runOnUIImmediately } from '../reanimated2/threads';
import type {
  AnimatedComponentProps,
  IAnimatedComponentInternal,
  IJSPropsUpdater,
  InitialComponentProps,
} from './commonTypes';

interface ListenerData {
  viewTag: number;
  props: StyleProps;
}

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

class JSPropsUpdaterPaper implements IJSPropsUpdater {
  private static _tagToComponentMapping = new Map();
  private _reanimatedEventEmitter: NativeEventEmitter;

  constructor() {
    this._reanimatedEventEmitter = new NativeEventEmitter(
      NativeModules.ReanimatedModule
    );
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    const viewTag = findNodeHandle(animatedComponent);
    JSPropsUpdaterPaper._tagToComponentMapping.set(viewTag, animatedComponent);
    if (JSPropsUpdaterPaper._tagToComponentMapping.size === 1) {
      const listener = (data: ListenerData) => {
        const component = JSPropsUpdaterPaper._tagToComponentMapping.get(
          data.viewTag
        );
        component?._updateFromNative(data.props);
      };
      this._reanimatedEventEmitter.addListener(
        'onReanimatedPropsChange',
        listener
      );
    }
  }

  public removeOnJSPropsChangeListener(
    animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    const viewTag = findNodeHandle(animatedComponent);
    JSPropsUpdaterPaper._tagToComponentMapping.delete(viewTag);
    if (JSPropsUpdaterPaper._tagToComponentMapping.size === 0) {
      this._reanimatedEventEmitter.removeAllListeners(
        'onReanimatedPropsChange'
      );
    }
  }
}

class JSPropsUpdaterFabric implements IJSPropsUpdater {
  private static _tagToComponentMapping = new Map();
  private static isInitialized = false;

  constructor() {
    if (!JSPropsUpdaterFabric.isInitialized) {
      const updater = (viewTag: number, props: unknown) => {
        const component =
          JSPropsUpdaterFabric._tagToComponentMapping.get(viewTag);
        component?._updateFromNative(props);
      };
      runOnUIImmediately(() => {
        'worklet';
        global.updateJSProps = (viewTag: number, props: unknown) => {
          runOnJS(updater)(viewTag, props);
        };
      })();
      JSPropsUpdaterFabric.isInitialized = true;
    }
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    if (!JSPropsUpdaterFabric.isInitialized) {
      return;
    }
    const viewTag = findNodeHandle(animatedComponent);
    JSPropsUpdaterFabric._tagToComponentMapping.set(viewTag, animatedComponent);
  }

  public removeOnJSPropsChangeListener(
    animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    if (!JSPropsUpdaterFabric.isInitialized) {
      return;
    }
    const viewTag = findNodeHandle(animatedComponent);
    JSPropsUpdaterFabric._tagToComponentMapping.delete(viewTag);
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
  | typeof JSPropsUpdaterFabric
  | typeof JSPropsUpdaterPaper;

let JSPropsUpdater: JSPropsUpdaterOptions;
if (SHOULD_BE_USE_WEB) {
  JSPropsUpdater = JSPropsUpdaterWeb;
} else if (global._IS_FABRIC) {
  JSPropsUpdater = JSPropsUpdaterFabric;
} else {
  JSPropsUpdater = JSPropsUpdaterPaper;
}

export default JSPropsUpdater;

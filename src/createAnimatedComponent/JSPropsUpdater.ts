'use strict';
import { NativeEventEmitter, Platform, findNodeHandle } from 'react-native';
import type { NativeModule } from 'react-native';
import { shouldBeUseWeb } from '../reanimated2/PlatformChecker';
import type { StyleProps } from '../reanimated2';
import { runOnJS, runOnUIImmediately } from '../reanimated2/threads';
import type { AnimatedComponent, IJSPropsUpdater } from './commonTypes';
import NativeReanimatedModule from '../specs/NativeReanimatedModule';

interface ListenerData {
  viewTag: number;
  props: StyleProps;
}

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

class JSPropsUpdaterPaper implements IJSPropsUpdater {
  private static _tagToComponentMapping = new Map();
  private _reanimatedEventEmitter: NativeEventEmitter;
  private _animatedComponent: AnimatedComponent;

  constructor(animatedComponent: AnimatedComponent) {
    this._reanimatedEventEmitter = new NativeEventEmitter(
      // NativeEventEmitter only uses this parameter on iOS.
      Platform.OS === 'ios'
        ? (NativeReanimatedModule as unknown as NativeModule)
        : undefined
    );
    this._animatedComponent = animatedComponent;
  }

  public addOnJSPropsChangeListener() {
    const viewTag = findNodeHandle(this._animatedComponent);
    JSPropsUpdaterPaper._tagToComponentMapping.set(
      viewTag,
      this._animatedComponent
    );
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

  public removeOnJSPropsChangeListener() {
    const viewTag = findNodeHandle(this._animatedComponent);
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
  private _component: AnimatedComponent;

  constructor(component: AnimatedComponent) {
    if (!JSPropsUpdaterFabric.isInitialized) {
      const updater = (viewTag: number, props: unknown) => {
        const componentToUpdate =
          JSPropsUpdaterFabric._tagToComponentMapping.get(viewTag);
        componentToUpdate?._updateFromNative(props);
      };
      runOnUIImmediately(() => {
        'worklet';
        global.updateJSProps = (viewTag: number, props: unknown) => {
          runOnJS(updater)(viewTag, props);
        };
      })();
      JSPropsUpdaterFabric.isInitialized = true;
    }
    this._component = component;
  }

  public addOnJSPropsChangeListener() {
    if (!JSPropsUpdaterFabric.isInitialized) {
      return;
    }
    const viewTag = findNodeHandle(this._component);
    JSPropsUpdaterFabric._tagToComponentMapping.set(viewTag, this._component);
  }

  public removeOnJSPropsChangeListener() {
    if (!JSPropsUpdaterFabric.isInitialized) {
      return;
    }
    const viewTag = findNodeHandle(this._component);
    JSPropsUpdaterFabric._tagToComponentMapping.delete(viewTag);
  }
}

class JSPropsUpdaterWeb implements IJSPropsUpdater {
  public addOnJSPropsChangeListener() {
    // noop
  }

  public removeOnJSPropsChangeListener() {
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

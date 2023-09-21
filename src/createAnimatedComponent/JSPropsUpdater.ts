'use strict';
import {
  NativeEventEmitter,
  NativeModules,
  findNodeHandle,
} from 'react-native';
import { nativeShouldBeMock } from '../reanimated2/PlatformChecker';
import type { StyleProps } from '../reanimated2';
import { runOnJS, runOnUIImmediately } from '../reanimated2/threads';

interface ListenerData {
  viewTag: number;
  props: StyleProps;
}

interface JSPropsUpdater {
  addOnJSPropsChangeListener: (
    animatedComponent: React.Component<unknown, unknown>
  ) => void;
  removeOnJSPropsChangeListener: (
    animatedComponent: React.Component<unknown, unknown>
  ) => void;
}

class JSPropsUpdaterPaper implements JSPropsUpdater {
  private static _tagToComponentMapping = new Map();
  private _reanimatedEventEmitter: NativeEventEmitter;
  private static _reanimatedModuleMock = {
    async addListener(): Promise<void> {
      // noop
    },
    async removeListeners(): Promise<void> {
      // noop
    },
  };

  constructor() {
    let reanimatedModule: typeof JSPropsUpdaterPaper._reanimatedModuleMock;
    if (nativeShouldBeMock()) {
      reanimatedModule = JSPropsUpdaterPaper._reanimatedModuleMock;
    } else {
      reanimatedModule = NativeModules.ReanimatedModule;
    }
    this._reanimatedEventEmitter = new NativeEventEmitter(reanimatedModule);
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown>
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
    animatedComponent: React.Component<unknown, unknown>
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

class JSPropsUpdaterFabric implements JSPropsUpdater {
  private static _tagToComponentMapping = new Map();
  private static isInitialized = false;

  constructor() {
    if (nativeShouldBeMock()) {
      return;
    }
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
    animatedComponent: React.Component<unknown, unknown>
  ) {
    if (!JSPropsUpdaterFabric.isInitialized) {
      return;
    }
    const viewTag = findNodeHandle(animatedComponent);
    JSPropsUpdaterFabric._tagToComponentMapping.set(viewTag, animatedComponent);
  }

  public removeOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown>
  ) {
    if (!JSPropsUpdaterFabric.isInitialized) {
      return;
    }
    const viewTag = findNodeHandle(animatedComponent);
    JSPropsUpdaterFabric._tagToComponentMapping.delete(viewTag);
  }
}

export default global._IS_FABRIC ? JSPropsUpdaterFabric : JSPropsUpdaterPaper;

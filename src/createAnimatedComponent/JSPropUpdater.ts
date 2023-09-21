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

interface JSPropUpdater {
  addOnJSPropsChangeListener: (
    animatedComponent: React.Component<unknown, unknown>
  ) => void;
  removeOnJSPropsChangeListener: (
    animatedComponent: React.Component<unknown, unknown>
  ) => void;
}

class JSPropUpdaterPaper implements JSPropUpdater {
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
    let reanimatedModule: typeof JSPropUpdaterPaper._reanimatedModuleMock;
    if (nativeShouldBeMock()) {
      reanimatedModule = JSPropUpdaterPaper._reanimatedModuleMock;
    } else {
      reanimatedModule = NativeModules.ReanimatedModule;
    }
    this._reanimatedEventEmitter = new NativeEventEmitter(reanimatedModule);
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown>
  ) {
    const viewTag = findNodeHandle(animatedComponent);
    JSPropUpdaterPaper._tagToComponentMapping.set(viewTag, animatedComponent);
    if (JSPropUpdaterPaper._tagToComponentMapping.size === 1) {
      const listener = (data: ListenerData) => {
        const component = JSPropUpdaterPaper._tagToComponentMapping.get(
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
    JSPropUpdaterPaper._tagToComponentMapping.delete(viewTag);
    if (JSPropUpdaterPaper._tagToComponentMapping.size === 0) {
      this._reanimatedEventEmitter.removeAllListeners(
        'onReanimatedPropsChange'
      );
    }
  }
}

class JSPropUpdaterFabric implements JSPropUpdater {
  private static _tagToComponentMapping = new Map();
  private static isInitialized = false;

  constructor() {
    if (!JSPropUpdaterFabric.isInitialized) {
      const updater = (viewTag: number, props: unknown) => {
        const component =
          JSPropUpdaterFabric._tagToComponentMapping.get(viewTag);
        component?._updateFromNative(props);
      };
      runOnUIImmediately(() => {
        'worklet';
        global.updateJSProps = (viewTag: number, props: unknown) => {
          runOnJS(updater)(viewTag, props);
        };
      })();
      JSPropUpdaterFabric.isInitialized = true;
    }
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown>
  ) {
    const viewTag = findNodeHandle(animatedComponent);
    JSPropUpdaterFabric._tagToComponentMapping.set(viewTag, animatedComponent);
  }

  public removeOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown>
  ) {
    const viewTag = findNodeHandle(animatedComponent);
    JSPropUpdaterFabric._tagToComponentMapping.delete(viewTag);
  }
}

export default global._IS_FABRIC ? JSPropUpdaterFabric : JSPropUpdaterPaper;

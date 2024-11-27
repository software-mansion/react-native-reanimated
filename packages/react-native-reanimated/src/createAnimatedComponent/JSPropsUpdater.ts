'use strict';
import { NativeEventEmitter, Platform } from 'react-native';
import type { NativeModule } from 'react-native';
import { shouldBeUseWeb } from '../PlatformChecker';
import type { StyleProps } from '../commonTypes';
import { runOnJS, runOnUIImmediately } from '../threads';
import type {
  AnimatedComponentProps,
  IAnimatedComponentInternal,
  IJSPropsUpdater,
  InitialComponentProps,
} from './commonTypes';
import NativeReanimatedModule from '../specs/NativeReanimatedModule';

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
      // NativeEventEmitter only uses this parameter on iOS and macOS.
      Platform.OS === 'ios' || Platform.OS === 'macos'
        ? (NativeReanimatedModule as unknown as NativeModule)
        : undefined
    );
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    const viewTag = animatedComponent.getComponentViewTag();
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
    const viewTag = animatedComponent.getComponentViewTag();
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
    const viewTag = animatedComponent.getComponentViewTag();
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
    const viewTag = animatedComponent.getComponentViewTag();
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

'use strict';
import {
  NativeEventEmitter,
  NativeModules,
  findNodeHandle,
} from 'react-native';
import { isWeb, nativeShouldBeMock } from '../reanimated2/PlatformChecker';
import type { StyleProps } from '../reanimated2';

interface ListenerData {
  viewTag: number;
  props: StyleProps;
}

interface WebAnimatedComponent extends React.Component<unknown, unknown> {
  _component: HTMLElement;
}

const IS_WEB = isWeb();

function getViewTagForComponent(
  animatedComponent: React.Component<unknown, unknown>
) {
  return IS_WEB
    ? (animatedComponent as WebAnimatedComponent)._component
    : findNodeHandle(animatedComponent);
}

export class JSPropUpdater {
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

  private static _listener(data: ListenerData) {
    const component = JSPropUpdater._tagToComponentMapping.get(data.viewTag);
    component && component._updateFromNative(data.props);
  }

  constructor() {
    let reanimatedModule: typeof JSPropUpdater._reanimatedModuleMock;
    if (nativeShouldBeMock()) {
      reanimatedModule = JSPropUpdater._reanimatedModuleMock;
    } else {
      reanimatedModule = NativeModules.ReanimatedModule;
    }
    this._reanimatedEventEmitter = new NativeEventEmitter(reanimatedModule);
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown>
  ) {
    const viewTag = getViewTagForComponent(animatedComponent);

    JSPropUpdater._tagToComponentMapping.set(viewTag, animatedComponent);
    if (JSPropUpdater._tagToComponentMapping.size === 1) {
      this._reanimatedEventEmitter.addListener(
        'onReanimatedPropsChange',
        JSPropUpdater._listener
      );
    }
  }

  public removeOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown>
  ) {
    const viewTag = getViewTagForComponent(animatedComponent);

    JSPropUpdater._tagToComponentMapping.delete(viewTag);
    if (JSPropUpdater._tagToComponentMapping.size === 0) {
      this._reanimatedEventEmitter.removeAllListeners(
        'onReanimatedPropsChange'
      );
    }
  }
}

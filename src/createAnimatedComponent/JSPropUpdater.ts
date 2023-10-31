'use strict';
import {
  NativeEventEmitter,
  NativeModules,
  findNodeHandle,
} from 'react-native';
import { isWeb, nativeShouldBeMock } from '../reanimated2/PlatformChecker';
import type { StyleProps } from '../reanimated2';
import type {
  AnimatedComponentProps,
  IAnimatedComponentInternal,
  IJSPropUpdater,
  InitialComponentProps,
} from './commonTypes';

interface ListenerData {
  viewTag: number;
  props: StyleProps;
}

interface WebAnimatedComponent<P, S> extends React.Component<P, S> {
  _component: HTMLElement;
}

const IS_WEB = isWeb();

function getViewTagForComponent<P, S>(
  animatedComponent: React.Component<P, S>
) {
  return IS_WEB
    ? (animatedComponent as WebAnimatedComponent<P, S>)._component
    : findNodeHandle(animatedComponent);
}

export class JSPropUpdater implements IJSPropUpdater {
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
    const reanimatedModule = nativeShouldBeMock()
      ? JSPropUpdater._reanimatedModuleMock
      : NativeModules.ReanimatedModule;

    this._reanimatedEventEmitter = new NativeEventEmitter(reanimatedModule);
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
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
    animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
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

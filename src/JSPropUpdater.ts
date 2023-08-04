import {
  NativeEventEmitter,
  NativeModules,
  findNodeHandle,
} from 'react-native';
import { nativeShouldBeMock } from './reanimated2/PlatformChecker';
import { StyleProps } from './reanimated2';

interface ListenerData {
  viewTag: number;
  props: StyleProps;
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
    let _reanimatedModule: typeof JSPropUpdater._reanimatedModuleMock;
    if (nativeShouldBeMock()) {
      _reanimatedModule = JSPropUpdater._reanimatedModuleMock;
    } else {
      _reanimatedModule = NativeModules._reanimatedModule;
    }
    this._reanimatedEventEmitter = new NativeEventEmitter(_reanimatedModule);
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown>
  ) {
    const viewTag = findNodeHandle(animatedComponent);
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
    const viewTag = findNodeHandle(animatedComponent);
    JSPropUpdater._tagToComponentMapping.delete(viewTag);
    if (JSPropUpdater._tagToComponentMapping.size === 0) {
      this._reanimatedEventEmitter.removeAllListeners(
        'onReanimatedPropsChange'
      );
    }
  }
}

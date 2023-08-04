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
  private static _TAG_TO_COMPONENT_MAPPING = new Map();
  private _reanimatedEventEmitter: NativeEventEmitter;
  private _reanimatedModule: typeof JSPropUpdater._reanimatedModuleMock;
  private static _reanimatedModuleMock = {
    async addListener(): Promise<void> {
      // noop
    },
    async removeListeners(): Promise<void> {
      // noop
    },
  };

  private static _listener(data: ListenerData) {
    const component = JSPropUpdater._TAG_TO_COMPONENT_MAPPING.get(data.viewTag);
    component && component._updateFromNative(data.props);
  }

  constructor() {
    if (nativeShouldBeMock()) {
      this._reanimatedModule = JSPropUpdater._reanimatedModuleMock;
    } else {
      const { _reanimatedModule } = NativeModules;
      this._reanimatedModule = _reanimatedModule;
    }
    this._reanimatedEventEmitter = new NativeEventEmitter(
      this._reanimatedModule
    );
  }

  public addOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown>
  ) {
    const viewTag = findNodeHandle(animatedComponent);
    JSPropUpdater._TAG_TO_COMPONENT_MAPPING.set(viewTag, animatedComponent);
    if (JSPropUpdater._TAG_TO_COMPONENT_MAPPING.size === 1) {
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
    JSPropUpdater._TAG_TO_COMPONENT_MAPPING.delete(viewTag);
    if (JSPropUpdater._TAG_TO_COMPONENT_MAPPING.size === 0) {
      this._reanimatedEventEmitter.removeAllListeners(
        'onReanimatedPropsChange'
      );
    }
  }
}

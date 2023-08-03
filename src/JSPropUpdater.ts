import {
  NativeEventEmitter,
  NativeModules,
  findNodeHandle,
} from 'react-native';
import { nativeShouldBeMock } from './reanimated2/PlatformChecker';
import { StyleProps } from './reanimated2';

const TAG_TO_COMPONENT_MAPPING = new Map();

interface ListenerData {
  viewTag: number;
  props: StyleProps;
}

function listener(data: ListenerData) {
  const component = TAG_TO_COMPONENT_MAPPING.get(data.viewTag);
  component && component._updateFromNative(data.props);
}

export class JSPropUpdater {
  static ReanimatedModuleMock = {
    async addListener(): Promise<void> {
      // noop
    },
    async removeListeners(): Promise<void> {
      // noop
    },
  };

  reanimatedModule: typeof JSPropUpdater.ReanimatedModuleMock;
  reanimatedEventEmitter: NativeEventEmitter;

  constructor() {
    if (nativeShouldBeMock()) {
      this.reanimatedModule = JSPropUpdater.ReanimatedModuleMock;
    } else {
      const { ReanimatedModule } = NativeModules;
      this.reanimatedModule = ReanimatedModule;
    }
    this.reanimatedEventEmitter = new NativeEventEmitter(this.reanimatedModule);
  }

  _attachPropUpdater(animatedComponent: React.Component<unknown, unknown>) {
    const viewTag = findNodeHandle(animatedComponent);
    TAG_TO_COMPONENT_MAPPING.set(viewTag, animatedComponent);
    if (TAG_TO_COMPONENT_MAPPING.size === 1) {
      this.reanimatedEventEmitter.addListener(
        'onReanimatedPropsChange',
        listener
      );
    }
  }

  _detachPropUpdater(animatedComponent: React.Component<unknown, unknown>) {
    const viewTag = findNodeHandle(animatedComponent);
    TAG_TO_COMPONENT_MAPPING.delete(viewTag);
    if (TAG_TO_COMPONENT_MAPPING.size === 0) {
      this.reanimatedEventEmitter.removeAllListeners('onReanimatedPropsChange');
    }
  }
}

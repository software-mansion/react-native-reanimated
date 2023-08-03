import { NativeEventEmitter, NativeModules } from 'react-native';
import { nativeShouldBeMock } from './reanimated2/PlatformChecker';
import { StyleProps } from './reanimated2';

export const NODE_MAPPING = new Map();

interface ListenerData {
  viewTag: number;
  props: StyleProps;
}

export function listener(data: ListenerData) {
  const component = NODE_MAPPING.get(data.viewTag);
  component && component._updateFromNative(data.props);
}

const ReanimatedModuleMock = {
  async addListener(): Promise<void> {
    // noop
  },
  async removeListeners(): Promise<void> {
    // noop
  },
};

let reanimatedModule: typeof ReanimatedModuleMock;
if (nativeShouldBeMock()) {
  reanimatedModule = ReanimatedModuleMock;
} else {
  const { ReanimatedModule } = NativeModules;
  reanimatedModule = ReanimatedModule;
}

export const ReanimatedEventEmitter = new NativeEventEmitter(reanimatedModule);

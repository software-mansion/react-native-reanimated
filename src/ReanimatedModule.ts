import { NativeModules } from 'react-native';
import { nativeShouldBeMock } from './reanimated2/PlatformChecker';

const ReanimatedModuleMock = {
  async addListener(): Promise<void> {
    // noop
  },
  async removeListeners(): Promise<void> {
    // noop
  },
};

let exportedModule: typeof ReanimatedModuleMock;
if (nativeShouldBeMock()) {
  exportedModule = ReanimatedModuleMock;
} else {
  const { ReanimatedModule } = NativeModules;
  exportedModule = ReanimatedModule;
}

export default exportedModule;

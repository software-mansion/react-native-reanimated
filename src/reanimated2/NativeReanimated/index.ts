import reanimatedJS from '../js-reanimated';
import { shouldBeUseWeb } from '../PlatformChecker';
import { NativeReanimated, NativeReanimatedModule } from './NativeReanimated';

interface Reanimated extends NativeReanimatedModule {
  native: boolean;
}

const exportedModule: Reanimated = shouldBeUseWeb()
  ? reanimatedJS
  : new NativeReanimated();

export default exportedModule;

import reanimatedJS from '../js-reanimated';
import { shouldBeUseWeb } from '../PlatformChecker';
import { NativeReanimated } from './NativeReanimated';

const NativeReanimatedModule = (
  shouldBeUseWeb() ? reanimatedJS : new NativeReanimated()
) as NativeReanimated;

export default NativeReanimatedModule;

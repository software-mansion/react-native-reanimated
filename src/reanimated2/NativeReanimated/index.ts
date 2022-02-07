import reanimatedJS from '../js-reanimated';
import { shouldBeUseWeb } from '../PlatformChecker';
import { Platform } from 'react-native';
import { NativeReanimated } from './NativeReanimated';

let exportedModule;
if (shouldBeUseWeb()) {
  exportedModule = reanimatedJS;
} else {
  exportedModule = new NativeReanimated();
  if (exportedModule.useOnlyV1 && Platform.OS === 'android') {
    console.warn(
      `If you want to use Reanimated 2 then go through our installation steps https://docs.swmansion.com/react-native-reanimated/docs/installation`
    );
  }
}

export default exportedModule as NativeReanimated;

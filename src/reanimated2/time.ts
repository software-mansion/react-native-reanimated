import NativeReanimatedModule from './NativeReanimated';
import { Platform } from 'react-native';
import { nativeShouldBeMock } from './PlatformChecker';
export { stopMapper } from './mappers';

let _getTimestamp: () => number;
if (nativeShouldBeMock()) {
  _getTimestamp = () => {
    return NativeReanimatedModule.getTimestamp();
  };
} else {
  _getTimestamp = () => {
    'worklet';
    return global.__frameTimestamp;
  };
}

export function getTimestamp(): number {
  'worklet';
  if (Platform.OS === 'web') {
    return NativeReanimatedModule.getTimestamp();
  }
  return _getTimestamp();
}

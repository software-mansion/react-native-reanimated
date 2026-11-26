import NativePolledCounter from './NativePolledCounter';

const { getCount: nativeGetCount } = NativePolledCounter;

export function getCount(): number {
  'worklet';
  return nativeGetCount();
}

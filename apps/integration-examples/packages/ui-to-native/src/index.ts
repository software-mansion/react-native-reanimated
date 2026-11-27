import NativePolledCounter from './NativePolledCounter';

// eslint-disable-next-line @typescript-eslint/unbound-method
const { getCount: nativeGetCount } = NativePolledCounter;

export function getCount(): number {
  'worklet';
  return nativeGetCount();
}

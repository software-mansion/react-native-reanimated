import { getRuntimeKind } from 'react-native-worklets';

export function describeNoLockingRuntime(label: string) {
  'worklet';
  return `${label}:no-locking:${getRuntimeKind()}`;
}

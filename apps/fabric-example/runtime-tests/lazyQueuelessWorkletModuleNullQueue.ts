import { getRuntimeKind } from 'react-native-worklets';

export function describeNullQueueRuntime(label: string) {
  'worklet';
  return `${label}:null-queue:${getRuntimeKind()}`;
}

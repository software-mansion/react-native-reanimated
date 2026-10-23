import { getRuntimeKind } from 'react-native-worklets';

export function describeNoDefaultQueueRuntime(label: string) {
  'worklet';
  return `${label}:no-default-queue:${getRuntimeKind()}`;
}

import {
  getRuntimeKind,
  runOnRuntimeSyncWithId,
  RuntimeKind,
} from 'react-native-worklets';

type ReentrantModuleGlobal = typeof globalThis & {
  __reentrantModuleRuntimeId?: number;
};

export const evaluationLog: string[] = [];

const runtimeId = (globalThis as ReentrantModuleGlobal)
  .__reentrantModuleRuntimeId;

if (getRuntimeKind() === RuntimeKind.Worker && runtimeId !== undefined) {
  evaluationLog.push('module begins');
  queueMicrotask(() => {
    evaluationLog.push('microtask');
  });
  runOnRuntimeSyncWithId(runtimeId, () => {
    'worklet';
  });
  evaluationLog.push('module ends');
}

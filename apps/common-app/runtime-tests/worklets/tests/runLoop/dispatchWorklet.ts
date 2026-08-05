import {
  RuntimeKind,
  scheduleOnRuntimeWithId,
  UIRuntimeId,
} from 'react-native-worklets';

import { getWorkletRuntimeFromPool } from '../../../ReJest/RuntimeTestsApi';

const workletRuntime = getWorkletRuntimeFromPool('test');

export function dispatchWorklet(worklet: () => void, runtimeKind: RuntimeKind) {
  const runtimeId =
    runtimeKind === RuntimeKind.UI ? UIRuntimeId : workletRuntime.runtimeId;
  scheduleOnRuntimeWithId(runtimeId, worklet);
}

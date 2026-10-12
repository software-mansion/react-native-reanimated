import {
  RuntimeKind,
  scheduleOnRuntimeWithId,
  UIRuntimeId,
} from 'react-native-worklets';

import { getWorkletRuntimesFromPool } from '../../../ReJest/RuntimeTestsApi';

const [workletRuntime] = getWorkletRuntimesFromPool(1);

export function dispatchWorklet(worklet: () => void, runtimeKind: RuntimeKind) {
  const runtimeId =
    runtimeKind === RuntimeKind.UI ? UIRuntimeId : workletRuntime.runtimeId;
  scheduleOnRuntimeWithId(runtimeId, worklet);
}

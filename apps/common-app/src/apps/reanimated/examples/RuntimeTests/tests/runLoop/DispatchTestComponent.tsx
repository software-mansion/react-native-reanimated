import { useEffect } from 'react';
import { View } from 'react-native';
import { createWorkletRuntime, scheduleOnRuntime, scheduleOnUI } from 'react-native-worklets';
import { RuntimeKind } from 'react-native-worklets';

const workletRuntime = createWorkletRuntime({ name: 'testRuntime' });

export function DispatchTestComponent({ worklet, runtimeKind }: { worklet: () => void; runtimeKind: RuntimeKind }) {
  useEffect(() => {
    if (runtimeKind === RuntimeKind.UI) {
      scheduleOnUI(() => {
        'worklet';
        worklet();
      });
    } else {
      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        worklet();
      });
    }
  });

  return <View />;
}

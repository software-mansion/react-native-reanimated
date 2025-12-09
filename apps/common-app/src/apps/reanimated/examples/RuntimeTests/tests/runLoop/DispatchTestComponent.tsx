import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createWorkletRuntime, scheduleOnRuntime, scheduleOnUI } from 'react-native-worklets';
import { RuntimeKind } from 'react-native-worklets';

let counter = 0;

export function DispatchTestComponent({ worklet, runtimeKind }: { worklet: () => void; runtimeKind: RuntimeKind }) {
  const [rt] = useState(() => {
    return runtimeKind === RuntimeKind.UI ? null : createWorkletRuntime({ name: 'testRuntime' + counter++ });
  });
  useEffect(() => {
    if (runtimeKind === RuntimeKind.UI) {
      scheduleOnUI(() => {
        'worklet';
        worklet();
      });
    } else {
      scheduleOnRuntime(rt!, () => {
        'worklet';
        worklet();
      });
    }
  });

  return <View />;
}

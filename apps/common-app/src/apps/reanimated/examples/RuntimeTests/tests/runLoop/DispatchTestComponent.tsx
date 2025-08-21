import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createWorkletRuntime, runOnRuntime, runOnUI } from 'react-native-worklets';
import { RuntimeKind } from 'react-native-worklets';

let counter = 0;

export function DispatchTestComponent({ worklet, runtimeKind }: { worklet: () => void; runtimeKind: RuntimeKind }) {
  const [rt] = useState(() => {
    return runtimeKind === RuntimeKind.UI ? null : createWorkletRuntime({ name: 'testRuntime' + counter++ });
  });
  useEffect(() => {
    if (runtimeKind === RuntimeKind.UI) {
      runOnUI(() => {
        'worklet';
        worklet();
      })();
    } else {
      runOnRuntime(rt!, () => {
        'worklet';
        worklet();
      })();
    }
  });

  return <View />;
}

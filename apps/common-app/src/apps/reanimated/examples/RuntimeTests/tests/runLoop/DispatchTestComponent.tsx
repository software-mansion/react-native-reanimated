import { useEffect } from 'react';
import { View } from 'react-native';
import { createWorkletRuntime, runOnRuntime, runOnUI } from 'react-native-worklets';
import { RuntimeKind } from 'react-native-worklets';

export function DispatchTestComponent({ worklet, runtimeKind }: { worklet: () => void; runtimeKind: RuntimeKind }) {
  useEffect(() => {
    if (runtimeKind === RuntimeKind.UI) {
      runOnUI(() => {
        'worklet';
        worklet();
      })();
    } else {
      const rt = createWorkletRuntime({ name: 'testRuntime' });
      runOnRuntime(rt, () => {
        'worklet';
        worklet();
      })();
    }
  });

  return <View />;
}

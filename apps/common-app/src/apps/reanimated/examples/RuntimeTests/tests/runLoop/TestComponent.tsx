import { useEffect } from 'react';
import { View } from 'react-native';
import { createWorkletRuntime, runOnRuntime, runOnUI } from 'react-native-worklets';

export function TestComponent({ worklet, runtimeType }: { worklet: () => void; runtimeType: string }) {
  useEffect(() => {
    if (runtimeType === 'ui') {
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

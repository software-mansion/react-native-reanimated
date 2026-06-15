import { useEffect } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import {
  scheduleOnRN,
  scheduleOnUI,
  createWorkletRuntime,
  scheduleOnRuntime,
  createSerializable,
} from 'react-native-worklets';

const workerRuntime = createWorkletRuntime();

export default function App() {
  useEffect(() => {
    scheduleOnUI(() => {
      function foo() {
        const _ = new Array(10000).fill(0);
        requestAnimationFrame(foo);
      }
      foo();
    });
  });

  return (
    <View style={styles.container}>
      <Button
        title="Init runtime"
        onPress={() => {
          scheduleOnRuntime(workerRuntime, () => {
            'worklet';
          });
        }}
      />
      <Button
        title="Press me first"
        onPress={() => {
          function logTest() {
            console.log('Button pressed!');
          }

          const serializedLogtest = createSerializable(logTest);
          const worklet = createSerializable((fun) => {
            'worklet';

            // scheduleOnRN(fun);
            globalThis.__workletsModuleProxy.scheduleOnRN(fun, undefined);

            globalThis.arr = [];

            setTimeout(() => {
              delete globalThis.arr;
              globalThis.arr = Array(10000).fill(0);
            }, 10);
          });

          globalThis.__workletsModuleProxy.scheduleOnRuntime3(
            workerRuntime,
            worklet,
            serializedLogtest
          );
        }}
      />
      <Button
        title="Press me second"
        onPress={() => {
          function otherTestLog() {
            console.log('Other button pressed!');
          }

          const serializedLogtest = createSerializable(otherTestLog);
          const worklet = createSerializable((fun) => {
            'worklet';

            globalThis.__workletsModuleProxy.scheduleOnRN(fun, undefined);
          });

          globalThis.__workletsModuleProxy.scheduleOnRuntime3(
            workerRuntime,
            worklet,
            serializedLogtest
          );
        }}
      />
      <Button
        title="Trigger GC"
        onPress={() => {
          scheduleOnRuntime(workerRuntime, () => {
            'worklet';
            gc();
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

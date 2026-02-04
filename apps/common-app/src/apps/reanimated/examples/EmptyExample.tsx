import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { makeMutable } from 'react-native-reanimated';
import {
  createShareable,
  createWorkletRuntime,
  runOnUISync,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

const shareable = createShareable('UI', 2137);

const mutable = makeMutable(0);

const workletRuntime = createWorkletRuntime();

export default function EmptyExample() {
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Button
        title="getSync from RN"
        onPress={() => {
          console.log('shareable on RN runtime:', shareable);
          const value = shareable.getSync!();
          console.log('getSync from RN:', value);
        }}
      />
      <Button
        title="get from UI"
        onPress={() => {
          scheduleOnUI(() => {
            'worklet';
            console.log('shareable on UI runtime:', shareable);
            const value = shareable.value!;
            console.log('get from UI:', value);
          });
        }}
      />
      <Button
        title="getSync from Worklet"
        onPress={() => {
          scheduleOnRuntime(workletRuntime, () => {
            'worklet';
            console.log('shareable on Worklet runtime:', shareable);
            const value = shareable.getSync!();
            console.log('getSync from Worklet:', value);
          });
        }}
      />
      <Button
        title="setAsync value from RN"
        onPress={() => {
          shareable.setAsync!(42);
          const value = shareable.getSync!();
          console.log('setAsync from RN: ', value);
        }}
      />
      <Button
        title="set value async from UI"
        onPress={() => {
          scheduleOnUI(() => {
            'worklet';
            shareable.value = 1337;
            console.log('set from UI:', shareable.value);
          });
        }}
      />
      <Button
        title="setAsync value from Worklet"
        onPress={() => {
          scheduleOnRuntime(workletRuntime, () => {
            'worklet';
            shareable.setAsync!(777);
            const value = shareable.getSync!();
            console.log('setAsync from Worklet:', value);
          });
        }}
      />
      <Button
        title="setSync value from RN"
        onPress={() => {
          shareable.setSync!(888);
          const value = shareable.getSync!();
          console.log('setSync from RN:', value);
        }}
      />
      <Button
        title="set value sync from UI"
        onPress={() => {
          runOnUISync(() => {
            'worklet';
            shareable.value = 444;
            const value = shareable.value;
            console.log('setSync from UI:', value);
          });
        }}
      />
      <Button
        title="setSync value from Worklet"
        onPress={() => {
          scheduleOnRuntime(workletRuntime, () => {
            'worklet';
            shareable.setSync!(555);
            const value = shareable.getSync!();
            console.log('setSync from Worklet:', value);
          });
        }}
      />
      <Button
        title="setSync setter from RN"
        onPress={() => {
          shareable.setSync!((prev) => {
            'worklet';
            return prev + 1;
          });
          const value = shareable.getSync!();
          console.log('setSync setter from RN:', value);
        }}
      />
      <Button
        title="setAsync setter from RN"
        onPress={() => {
          shareable.setAsync!((prev) => {
            'worklet';
            return prev + 10;
          });
          const value = shareable.getSync!();
          console.log('setAsync setter from RN:', value);
        }}
      />
      <Button
        title="Mutable RN operations"
        onPress={() => {
          mutable.value = mutable.value + 1;
          console.log('Mutable value from RN:', mutable.value);
          mutable.value += 10;
          console.log('Mutable value from RN after +=10:', mutable.value);
          mutable.set(203);
          console.log('Mutable value from RN after set(203):', mutable.value);
          mutable.set((value) => {
            'worklet';
            return value + 37;
          });
          console.log(
            'Mutable value from RN after set with setter:',
            mutable.value
          );
          mutable.modify((value) => {
            'worklet';
            return value * 2;
          });
          console.log('Mutable value from RN after modify:', mutable.value);
        }}
      />
      <Button
        title="Mutable UI operations"
        onPress={() => {
          scheduleOnUI(() => {
            'worklet';
            mutable.value = mutable.value + 1;
            console.log('Mutable value from UI:', mutable.value);
            mutable.value += 10;
            console.log('Mutable value from UI after +=10:', mutable.value);
            mutable.set(203);
            console.log('Mutable value from UI after set(203):', mutable.value);
            mutable.set((value) => {
              'worklet';
              return value + 37;
            });
            console.log(
              'Mutable value from UI after set with setter:',
              mutable.value
            );
            mutable.modify((value) => {
              'worklet';
              return value * 2;
            });
            console.log('Mutable value from UI after modify:', mutable.value);
          });
        }}
      />
      <Button
        title="Mutable Worklet operations"
        onPress={() => {
          scheduleOnRuntime(workletRuntime, () => {
            'worklet';
            mutable.value = 313;
            console.log('Mutable value from Worklet 313:', mutable.value);
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

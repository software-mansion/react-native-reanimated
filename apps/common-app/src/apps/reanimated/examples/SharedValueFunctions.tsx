import { Button, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

export default function SharedValueFunctions() {
  const sharedValueFn = useSharedValue<() => void>(() => {
    'worklet';
    console.log('Hello from an INITIAL shared value function!');
  });

  const updateFunction = () => {
    const newFn = () => {
      'worklet';
      console.log('Hello from an UPDATED shared value function!');
    };

    // sharedValueFn.modify(() => newFn);
    // sharedValueFn.modify(() => {
    //   'worklet';

    //   return newFn;
    // });
    sharedValueFn.value = newFn;
    // sharedValueFn.value = () => newFn;
  };

  const tap = Gesture.Tap().onBegin(() => {
    sharedValueFn.value();
  });

  return (
    <View style={styles.container}>
      <Button title="Update shared value" onPress={updateFunction} />
      <GestureDetector gesture={tap}>
        <Text style={styles.text}>Click me to see the output</Text>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    padding: 8,
    backgroundColor: 'lightblue',
    borderRadius: 8,
  },
});

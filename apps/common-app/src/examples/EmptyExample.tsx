import { Text, StyleSheet, View, Button } from 'react-native';

import React from 'react';
import { useSharedValue } from 'react-native-reanimated';

export default function EmptyExample() {
  const [counter, setCounter] = React.useState(0);
  const sv = useSharedValue(0);

  // logs writing to `value`... warning
  sv.value = counter;
  // logs reading from `value`... warning
  console.log('Shared value:', sv.value);

  const reRender = () => {
    setCounter((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      <Button title="Re-render" onPress={reRender} />
      <Text>Counter: {counter}</Text>
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

import { Button, StyleSheet, Text, View } from 'react-native';

import Animated from 'react-native-reanimated';
import { enableExperimentalWebImplementation } from 'react-native-gesture-handler';
import { useState } from 'react';

enableExperimentalWebImplementation(true);

export default function App() {
  const [visible, setVisible] = useState(true);
  const [state, setState] = useState(false);

  const toggleVisibility = () => {
    setVisible((v) => !v);
  };

  const toggleOrder = () => {
    setState((s) => !s);
  };

  return (
    <View style={styles.container}>
      <Button title="Toggle visibility" onPress={toggleVisibility} />
      <Button title="Toggle order" onPress={toggleOrder} />
      {visible && (
        <Animated.View style={[styles.box, state ? styles.override : {}]}>
          <Text>Hello world!</Text>
          <View style={styles.inner} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 100,
  },
  box: {
    width: 150,
    height: 150,
    backgroundColor: 'lime',
  },
  override: {
    width: 250,
    height: 250,
    backgroundColor: 'green',
  },
  inner: {
    backgroundColor: 'black',
    width: 30,
    height: 30,
  },
});

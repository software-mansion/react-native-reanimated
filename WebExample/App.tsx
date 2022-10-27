import { Button, StyleSheet, View } from 'react-native';

import Animated from 'react-native-reanimated';
import { enableExperimentalWebImplementation } from 'react-native-gesture-handler';
import { useState } from 'react';

enableExperimentalWebImplementation(true);

export default function App() {
  const [visible, setVisible] = useState(true);

  const toggle = () => {
    setVisible((v) => !v);
  };

  return (
    <View style={styles.container}>
      <Button title="Toggle" onPress={toggle} />
      {visible && <Animated.View style={styles.box} />}
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
    backgroundColor: 'red',
  },
});

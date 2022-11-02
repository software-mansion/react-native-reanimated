import { Button, StyleSheet, View } from 'react-native';

import Animated from 'react-native-reanimated';
import { enableExperimentalWebImplementation } from 'react-native-gesture-handler';
import { useState } from 'react';

enableExperimentalWebImplementation(true);

const colors = ['', 'tomato', 'gold', 'lime', 'cyan', 'violet'];

export default function App() {
  const [visible, setVisible] = useState(true);
  const [state, setState] = useState(true);

  const toggleVisibility = () => {
    setVisible((v) => !v);
  };

  const toggleOrder = () => {
    setState((s) => !s);
  };

  const array = state ? [1, 2, 3, 4, 5] : [3, 2, 1, 5, 4];

  return (
    <View style={styles.container}>
      <Button title="Toggle visibility" onPress={toggleVisibility} />
      <Button title="Toggle order" onPress={toggleOrder} />
      {visible &&
        array.map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.box,
              {
                backgroundColor: colors[i],
                marginLeft: i * 10,
                width: state ? 200 : 300,
                zIndex: 10 - i,
              },
            ]}>
            <View
              style={{
                width: 20,
                height: 20,
                backgroundColor: 'black',
              }}
            />
            {i}
          </Animated.View>
        ))}
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
    width: 300,
    height: 60,
    borderWidth: 1,
    borderColor: 'gray',
    fontFamily: 'sans-serif',
    fontSize: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

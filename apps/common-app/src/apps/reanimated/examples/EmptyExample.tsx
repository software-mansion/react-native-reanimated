import { StyleSheet, View, Button } from 'react-native';

import React, { useReducer } from 'react';
import Animated from 'react-native-reanimated';

export default function EmptyExample() {
  const [state, toggleState] = useReducer((s) => !s, false);

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          width: state ? 200 : 100,
          height: state ? 200 : 100,
          // eslint-disable-next-line no-inline-styles/no-inline-styles
          backgroundColor: 'red',
          // eslint-disable-next-line no-inline-styles/no-inline-styles
          transition: 'all 0.5s 0.1s ease-in-out, height 1s steps(5)',
        }}
      />
      <Button title="Toggle width" onPress={toggleState} />
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

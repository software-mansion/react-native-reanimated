import { Button, StyleSheet, View } from 'react-native';

import Animated from 'react-native-reanimated';
import React from 'react';

export default function EmptyExample() {
  const [state, setState] = React.useState(false);

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          width: 100,
          height: 100,
          marginLeft: state ? 200 : 0,
          backgroundColor: state ? 'red' : 'blue',
        }}
      />
      <Button onPress={() => setState(!state)} title="Toggle" />
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

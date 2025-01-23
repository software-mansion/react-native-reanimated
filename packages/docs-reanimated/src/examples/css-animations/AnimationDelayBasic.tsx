import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

const grow = {
  to: {
    width: 240,
  },
};

export default function App() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: grow,
            animationDuration: 300,
            animationFillMode: 'forwards',
            // highlight-next-line
            animationDelay: '1s',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  box: {
    height: 120,
    width: 120,
    marginVertical: 64,
    backgroundColor: '#82cab2',
  },
});

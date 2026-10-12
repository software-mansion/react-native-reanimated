import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

export default function App() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            // highlight-next-line
            backgroundColor: { default: '#b58df1', ':hover': '#fa7f7c' },
            transitionDuration: 400,
          },
        ]}>
        <Text style={styles.label}>color</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.box,
          {
            backgroundColor: '#82cab2',
            // highlight-next-line
            borderRadius: { default: 8, ':hover': 40 },
            transitionDuration: 400,
          },
        ]}>
        <Text style={styles.label}>radius</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.box,
          {
            backgroundColor: '#87cce8',
            // highlight-next-line
            transform: { default: [{ scale: 1 }], ':hover': [{ scale: 1.2 }] },
            transitionDuration: 400,
          },
        ]}>
        <Text style={styles.label}>scale</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 24,
  },
  box: {
    alignItems: 'center',
    borderRadius: 8,
    height: 80,
    justifyContent: 'center',
    marginVertical: 64,
    width: 80,
  },
  label: {
    color: 'white',
    fontWeight: 'bold',
    userSelect: 'none',
  },
});

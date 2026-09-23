import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function App() {
  return (
    <View style={styles.container}>
      <AnimatedPressable
        style={[
          styles.button,
          {
            // highlight-start
            backgroundColor: {
              default: '#b58df1',
              ':hover': '#82cab2',
              ':active': '#fa7f7c',
            },
            transform: { default: [{ scale: 1 }], ':active': [{ scale: 0.9 }] },
            transitionProperty: ['backgroundColor', 'transform'],
            transitionDuration: [600, 100],
            // highlight-end
          },
        ]}>
        <Text style={styles.label}>Hover, then press</Text>
      </AnimatedPressable>
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
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    marginVertical: 64,
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  label: {
    color: 'white',
    fontWeight: 'bold',
    userSelect: 'none',
  },
});

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
            // highlight-start
            backgroundColor: {
              default: '#b58df1',
              ':hover': '#82cab2',
            },
            transform: {
              default: [{ scale: 1 }],
              ':active': [{ scale: 0.9 }],
            },
            // highlight-end
            transitionDuration: 300,
          },
        ]}>
        <Text style={styles.label}>Hover or press me</Text>
      </Animated.View>
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
    alignItems: 'center',
    borderRadius: 16,
    height: 140,
    justifyContent: 'center',
    margin: 64,
    padding: 16,
    width: 140,
  },
  label: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    userSelect: 'none',
  },
});

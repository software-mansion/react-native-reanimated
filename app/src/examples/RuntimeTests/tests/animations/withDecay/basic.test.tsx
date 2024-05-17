import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withDecay, WithDecayConfig } from 'react-native-reanimated';
import React from 'react';
import { describe, test, render, wait } from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';

describe.only('withDecay animation, test various config', () => {
  const DecayComponent = ({ config }: { config: WithDecayConfig }) => {
    const animatedStyle = useAnimatedStyle(() => {
      return {
        left: withDecay(config),
      };
    });

    return (
      <View style={styles.container}>
        <Animated.View style={[styles.animatedBox, animatedStyle]} />
      </View>
    );
  };

  test.each([
    { velocity: 900 },
    { velocity: 9, velocityFactor: 100 },
    { velocity: 900, deceleration: 0.997 },
    { velocity: 900, clamp: [0, 150] },
    { velocity: 900, clamp: [0, 150], rubberBandEffect: true },
    { velocity: 2000, clamp: [0, 150], rubberBandEffect: true },
    { velocity: 2000, clamp: [0, 150], rubberBandEffect: true, rubberBandFactor: 2 },
  ] as Array<WithDecayConfig>)('Config %p', async config => {
    await render(<DecayComponent config={config} />);
    await wait(3000);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    width: 50,
    height: 50,
    margin: 0,
    backgroundColor: 'midnightblue',
    borderWidth: 2,
    borderRadius: 10,
  },
});

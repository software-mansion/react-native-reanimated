import { View, StyleSheet } from 'react-native';
import type { WithDecayConfig } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, withDecay } from 'react-native-reanimated';
import React from 'react';
import {
  describe,
  test,
  render,
  wait,
  mockAnimationTimer,
  recordAnimationUpdates,
  unmockAnimationTimer,
  expect,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { Snapshots } from './basic.snapshot';

describe('withDecay animation, test various config', () => {
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

  async function getSnapshotUpdates(config: WithDecayConfig, duration: number) {
    await mockAnimationTimer();
    const updatesContainer = await recordAnimationUpdates();
    await render(<DecayComponent config={config} />);

    await wait(duration);

    const updates = updatesContainer.getUpdates();
    const nativeUpdates = await updatesContainer.getNativeSnapshots();
    await unmockAnimationTimer();

    return [updates, nativeUpdates];
  }

  test.each([
    [1200, { velocity: 900 }],
    [600, { velocity: 9, velocityFactor: 100 }],
    [900, { velocity: 900, deceleration: 0.997 }],
    [400, { velocity: 900, clamp: [0, 150] }],
    [900, { velocity: 900, clamp: [0, 150], rubberBandEffect: true }],
    [800, { velocity: 2000, clamp: [0, 150], rubberBandEffect: true }],
    [500, { velocity: 2000, clamp: [0, 150], rubberBandEffect: true, rubberBandFactor: 2 }],
  ] as Array<[number, WithDecayConfig]>)('Config ${1}', async ([duration, config]) => {
    const snapshotName =
      'decay_' +
      Object.entries(config)
        .map(([key, val]) => {
          return `${key}_${val.toString().replace(/\./g, '_').replace(/,/g, '_')}`;
        })
        .join('$');

    const [updates, nativeUpdates] = await getSnapshotUpdates(config, duration);
    expect(updates).toMatchSnapshots(Snapshots[snapshotName as keyof typeof Snapshots]);
    expect(updates).toMatchNativeSnapshots(nativeUpdates);
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

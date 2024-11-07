import { View, StyleSheet } from 'react-native';
import type { WithDecayConfig } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, withDecay } from 'react-native-reanimated';
import React from 'react';
import {
  describe,
  test,
  render,
  mockAnimationTimer,
  recordAnimationUpdates,
  unmockAnimationTimer,
  expect,
  waitForAnimationUpdates,
} from '../../../ReJest/RuntimeTestsApi';
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

  async function getSnapshotUpdates(snapshotName: keyof typeof Snapshots, config: WithDecayConfig) {
    await mockAnimationTimer();
    const updatesContainer = await recordAnimationUpdates();
    await render(<DecayComponent config={config} />);

    await waitForAnimationUpdates(Snapshots[snapshotName].length);

    const updates = updatesContainer.getUpdates();
    const nativeUpdates = await updatesContainer.getNativeSnapshots();
    await unmockAnimationTimer();

    return [updates, nativeUpdates];
  }

  test.each([
    { velocity: 900 },
    { velocity: 9, velocityFactor: 100 },
    { velocity: 900, deceleration: 0.997 },
    { velocity: 900, clamp: [0, 150] },
    { velocity: 900, clamp: [0, 150], rubberBandEffect: true },
    { velocity: 2000, clamp: [0, 150], rubberBandEffect: true },
    { velocity: 2000, clamp: [0, 150], rubberBandEffect: true, rubberBandFactor: 2 },
  ] as Array<WithDecayConfig>)('Config ${0}', async config => {
    const snapshotName = ('decay_' +
      Object.entries(config)
        .map(([key, val]) => {
          return `${key}_${val.toString().replace(/\./g, '_').replace(/,/g, '_')}`;
        })
        .join('$')) as keyof typeof Snapshots;

    const [updates, nativeUpdates] = await getSnapshotUpdates(snapshotName, config);
    expect(updates).toMatchSnapshots(Snapshots[snapshotName]);
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

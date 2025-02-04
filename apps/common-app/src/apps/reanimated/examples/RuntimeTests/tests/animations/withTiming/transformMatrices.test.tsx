import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import {
  describe,
  test,
  expect,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  waitForAnimationUpdates,
} from '../../../ReJest/RuntimeTestsApi';
import { MatrixSnapshots } from './withTiming.snapshot';

const AnimatedComponent = ({
  initialTransform,
  finalTransform,
}: {
  initialTransform: Array<number>;
  finalTransform: Array<number>;
}) => {
  const transformMatrixSv = useSharedValue(initialTransform);

  const style = useAnimatedStyle(() => {
    return {
      transform: [{ matrix: transformMatrixSv.value }],
    };
  });

  useEffect(() => {
    transformMatrixSv.value = withTiming(finalTransform, { duration: 1000 });
  }, [transformMatrixSv, finalTransform]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animatedBox, style]} />
    </View>
  );
};

async function getSnapshotUpdates(
  snapshotName: keyof typeof MatrixSnapshots,
  initialTransform: Array<number>,
  finalTransform: Array<number>,
) {
  await mockAnimationTimer();
  const updatesContainer = await recordAnimationUpdates();
  await render(<AnimatedComponent initialTransform={initialTransform} finalTransform={finalTransform} />);

  await waitForAnimationUpdates(MatrixSnapshots[snapshotName].length);
  const updates = updatesContainer.getUpdates();
  return updates;
}

describe('withTiming snapshots 📸, test TRANSFORM MATRIX', () => {
  test.each([
    {
      initialTransform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      finalTransform: [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2],
    },
    {
      initialTransform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      finalTransform: [1, 1, 1, 1, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2],
    },
    {
      initialTransform: [1, 0, 0, 0, 0, 1, 0.5, 0, 0.5, 0, 1, 0, 0, 0, 0.5, 1],
      finalTransform: [1, 1, 1, 1, 0, 2, 0, 0, 0, 0, 10, 0, 0, 0, 0, 2],
    },
    {
      initialTransform: [10, 10, 10, 10, 0, 1, 0.5, 0, 0.5, 0, 1, 0, 0, 0, 0.5, 1],
      finalTransform: [1, 1, 1, 1, 0, 2, 0, 0.5, 30, 0, 10, 0, 0, 0, 0, 2],
    },
    {
      initialTransform: [-10, -20, -10, 10, 0, 1, 0.5, 0, 0.5, 0, 1, 60, 0, 0, 0.5, 1],
      finalTransform: [1, 1, 100, 1, 0, 2, 0, 0.5, 30, 0, 10, 0, 30, 0, 0, 2],
    },
  ])('From ${initialTransform} to ${finalTransform}', async ({ initialTransform, finalTransform }, index) => {
    const snapshotName = `matrix_${index}` as keyof typeof MatrixSnapshots;
    const updates = await getSnapshotUpdates(snapshotName, initialTransform, finalTransform);
    expect(updates).toMatchSnapshots(MatrixSnapshots[snapshotName]);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    height: 80,
    width: 80,
    margin: 80,
    backgroundColor: 'dodgerblue',
  },
});

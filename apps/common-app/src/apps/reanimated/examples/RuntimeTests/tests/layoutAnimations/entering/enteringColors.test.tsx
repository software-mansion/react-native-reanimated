import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { withDelay, withTiming } from 'react-native-reanimated';

import {
  describe,
  expect,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  test,
  waitForAnimationUpdates,
} from '../../../ReJest/RuntimeTestsApi';
import { ColorSnapshots as Snapshots } from './entering.snapshot';

const AnimatedComponent = ({ fromColor, toColor }: { fromColor: string; toColor: string }) => {
  const customAnim = () => {
    'worklet';
    const animations = {
      backgroundColor: withDelay(500, withTiming(toColor, { duration: 500 })),
    };
    const initialValues = { backgroundColor: fromColor };
    return { initialValues, animations };
  };

  return <Animated.View style={styles.colorBox} entering={customAnim} />;
};

async function getSnapshotUpdates(fromColor: string, toColor: string, snapshot: Array<any>) {
  await mockAnimationTimer();
  const updatesContainer = await recordAnimationUpdates();
  await render(<AnimatedComponent fromColor={fromColor} toColor={toColor} />);
  await waitForAnimationUpdates(snapshot.length);
  const updates = updatesContainer.getUpdates();
  const nativeUpdates = await updatesContainer.getNativeSnapshots();
  return [updates, nativeUpdates];
}

describe('entering with custom animation (withDelay + withTiming color changes) test', () => {
  test.each([
    ['rgba(16, 128, 26, 1)', 'rgba(179, 6, 6, 1)'],
    ['rgba(143, 253, 140, 1)', 'rgba(29, 247, 107, 1)'],
    ['rgba(226, 167, 48, 1)', 'rgba(222, 251, 137, 1)'],
    ['rgba(201, 25, 139, 1)', 'rgba(91, 234, 32, 1)'],
    ['rgba(246, 121, 228, 1)', 'rgba(10, 192, 235, 1)'],
    ['rgba(12, 115, 38, 1)', 'rgba(242, 174, 57, 1)'],
    ['rgba(169, 198, 146, 1)', 'rgba(238, 116, 102, 1)'],
    ['rgba(222, 170, 194, 1)', 'rgba(79, 79, 145, 1)'],
    ['rgba(116, 58, 155, 1)', 'rgba(161, 66, 77, 1)'],
    ['rgba(232, 113, 116, 1)', 'rgba(158, 201, 27, 1)'],
  ])('Entering color from ${0} to ${1}', async ([fromColor, toColor]) => {
    const snapshotName = (fromColor + toColor)
      .replace(/\s/g, '')
      .replace(/[()]/g, '_')
      .replace(/,/g, '_')
      .replace(/rgba/g, '') as keyof typeof Snapshots;
    const snapshot = Snapshots[snapshotName];
    const [updates, nativeUpdates] = await getSnapshotUpdates(fromColor, toColor, snapshot);
    expect(updates).toMatchSnapshots(snapshot);
    expect(updates).toMatchNativeSnapshots(nativeUpdates);
  });
});

const styles = StyleSheet.create({ colorBox: { flex: 1 } });

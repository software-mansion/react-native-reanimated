import Animated, { Easing, LinearTransition } from 'react-native-reanimated';

import {
  advanceAnimationTimer,
  describe,
  expect,
  getTestComponent,
  mockAnimationTimer,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

function Box({ width, color }: { width: number; color: string }) {
  const ref = useTestRef('box');
  return (
    <Animated.View
      ref={ref}
      layout={LinearTransition.duration(1000).easing(Easing.linear)}
      style={{ width, height: 40, backgroundColor: color }}
    />
  );
}

async function expectBox(width: number, color: string) {
  const props = await getTestComponent('box').getMountedViewProps();
  expect(props?.width).toBe(width, ComparisonMode.PIXEL);
  expect(props?.backgroundColor).toBe(color, ComparisonMode.COLOR);
}

describe('Layout animation start props', () => {
  test('keeps a color from an earlier update during a layout animation', async () => {
    await mockAnimationTimer({ autoAdvance: false });
    await render(<Box width={60} color="#ff0000" />);
    await waitForFrames();
    // On Android, the props of this update hold only the color.
    await render(<Box width={60} color="#00ff00" />);
    await waitForFrames(3);
    await expectBox(60, '#00ff00');

    await render(<Box width={160} color="#00ff00" />);
    await waitForFrames(3);
    await advanceAnimationTimer(500);
    await expectBox(110, '#00ff00');
    await advanceAnimationTimer(500);
    await expectBox(160, '#00ff00');
  });
});

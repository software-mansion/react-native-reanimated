import { Platform, TextInput } from 'react-native';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
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

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function Input({ width }: { width: number }) {
  const ref = useTestRef('input');
  return (
    <AnimatedTextInput
      ref={ref}
      accessibilityLabel="layout input"
      editable={false}
      layout={LinearTransition.duration(1000).easing(Easing.linear)}
      style={{ width, height: 40 }}
    />
  );
}

describe('Layout animation start props', () => {
  const setterTest =
    RuntimeTestObserver && Platform.OS === 'android' ? test : test.skip;

  setterTest(
    'does not repeat a content setter during a layout animation',
    async () => {
      await mockAnimationTimer(false);
      await render(<Input width={60} />);
      await waitForFrames();
      const input = getTestComponent('input');
      const mounted = await input.getTextInputObservation();
      expect((mounted?.labelSetterCalls ?? 0) > 0).toBe(true);

      await render(<Input width={160} />);
      await waitForFrames(3);
      await advanceAnimationTimer(500);
      expect((await input.getMountedViewProps())?.width).toBe(
        110,
        ComparisonMode.PIXEL
      );
      await advanceAnimationTimer(500);
      expect((await input.getMountedViewProps())?.width).toBe(
        160,
        ComparisonMode.PIXEL
      );
      const after = await input.getTextInputObservation();
      expect(after?.labelSetterCalls).toBe(mounted?.labelSetterCalls);
      expect(after?.accessibilityLabel).toBe('layout input');
    }
  );
});

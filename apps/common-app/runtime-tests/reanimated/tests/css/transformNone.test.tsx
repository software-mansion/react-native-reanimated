import { View } from 'react-native';
import Animated, {
  measure,
  useAnimatedRef,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import {
  describe,
  expectEventually,
  getSharedValue,
  registerValue,
  render,
  test,
} from '../../../ReJest/RuntimeTestsApi';

function TransformExample({ from }: { from?: 'none' | 'empty' }) {
  const animatedRef = useAnimatedRef();
  const staticRef = useAnimatedRef();
  const displacement = useSharedValue<number | null>(null);
  const height = useSharedValue<number | null>(null);
  registerValue('height', height);
  registerValue('displacement', displacement);
  useFrameCallback(() => {
    const animated = measure(animatedRef);
    const reference = measure(staticRef);
    if (animated && reference) {
      displacement.value = animated.pageX - reference.pageX;
      height.value = animated.height;
    }
  });
  return (
    <View>
      <Animated.View
        ref={animatedRef}
        style={{
          animationDelay: -250,
          animationDuration: 1000,
          animationFillMode: 'both',
          animationName: {
            ...(from === 'none'
              ? { from: { height: 80, transform: 'none' } }
              : {}),
            ...(from === 'empty'
              ? { from: { height: 80, transform: [] } }
              : {}),
            to: { height: 120, transform: [{ translateX: 40 }] },
          },
          animationPlayState: 'paused',
          animationTimingFunction: 'linear',
          height: 80,
          transform: [{ translateX: 80 }],
          width: 80,
        }}
      />
      <Animated.View
        ref={staticRef}
        style={{ height: 80, transform: [{ translateX: 80 }], width: 80 }}
      />
    </View>
  );
}

describe('CSS transform none keyframes on the commit path', () => {
  test.each([undefined, 'empty', 'none'] as const)(
    'transform keyframe start: %p',
    async (from) => {
      await render(<TransformExample from={from} />);
      // An omitted start keeps the view's own translateX 80, an explicit
      // empty list or none starts from the identity transform.
      await expectEventually(() => getSharedValue('height'), 3000).toBe(90);
      await expectEventually(() => getSharedValue('displacement'), 3000).toBe(
        from ? -70 : -10
      );
    }
  );
});

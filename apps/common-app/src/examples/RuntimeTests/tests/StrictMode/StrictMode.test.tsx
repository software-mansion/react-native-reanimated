import { StrictMode, useEffect } from 'react';
import {
  describe,
  test,
  render,
  expect,
  mockAnimationTimer,
  beforeEach,
  recordAnimationUpdates,
  waitForAnimationUpdates,
} from '../../ReJest/RuntimeTestsApi';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Snapshot } from './StrictMode.snapshot';

function AssignValueExample() {
  const width = useSharedValue(100);
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(width.value),
  }));
  useEffect(() => {
    width.value = 200;
  }, [width]);

  return (
    <StrictMode>
      <Animated.View style={[{ height: 100, backgroundColor: 'green' }, animatedStyle]} />
    </StrictMode>
  );
}

function AssignAnimationExample() {
  const width = useSharedValue(100);
  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));
  useEffect(() => {
    width.value = withTiming(200);
  }, [width]);

  return (
    <StrictMode>
      <Animated.View style={[{ height: 100, backgroundColor: 'green' }, animatedStyle]} />
    </StrictMode>
  );
}

describe('StrictMode', async () => {
  beforeEach(async () => {
    await mockAnimationTimer();
  });

  test('Run animation in StrictMode - assign animation', async () => {
    const updateContainer = await recordAnimationUpdates();

    await render(<AssignValueExample />);
    await waitForAnimationUpdates(Snapshot.assignValue.length);

    const jsUpdates = updateContainer.getUpdates();
    const nativeUpdates = await updateContainer.getNativeSnapshots();
    expect(jsUpdates).toMatchSnapshots(Snapshot.assignValue);
    expect(jsUpdates).toMatchNativeSnapshots(nativeUpdates);
  });

  test('Run animation in StrictMode - assign value', async () => {
    const updateContainer = await recordAnimationUpdates();

    await render(<AssignAnimationExample />);
    await waitForAnimationUpdates(Snapshot.assignAnimation.length);

    const jsUpdates = updateContainer.getUpdates();
    const nativeUpdates = await updateContainer.getNativeSnapshots();
    expect(jsUpdates).toMatchSnapshots(Snapshot.assignAnimation);
    expect(jsUpdates).toMatchNativeSnapshots(nativeUpdates);
  });
});

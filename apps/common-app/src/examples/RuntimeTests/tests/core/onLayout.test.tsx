import { useEffect } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, runOnUI, useAnimatedStyle, useEvent, useSharedValue } from 'react-native-reanimated';
import { describe, expect, notify, render, test, wait, waitForNotify } from '../../ReJest/RuntimeTestsApi';

interface TestResult {
  height: number;
  animatedHandlerCalled: boolean;
}

const TestComponent = ({ result, notifyId }: { result: TestResult; notifyId: number }) => {
  const height = useSharedValue(styles.smallBox.height);

  const onLayout = (event: LayoutChangeEvent) => {
    result.height = event.nativeEvent.layout.height;
    if (result.height === 200) {
      notify(`onLayout${notifyId}`);
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return { height: height.value };
  });

  useEffect(() => {
    runOnUI(() => {
      height.value += 100;
    })();
  }, [height]);

  const setAnimatedHandlerCalled = () => {
    result.animatedHandlerCalled = true;
    notify(`animatedOnLayout${notifyId}`);
  };

  const animatedOnLayout = useEvent(() => {
    'worklet';
    runOnJS(setAnimatedHandlerCalled)();
  }, ['onLayout']);

  return (
    <View onLayout={onLayout}>
      <Animated.View style={[styles.smallBox, animatedStyle]} onLayout={animatedOnLayout} />
    </View>
  );
};

describe('onLayout', () => {
  test('is not intercepted when there are no registered event handlers', async () => {
    const result = {} as TestResult;
    await render(<TestComponent result={result} notifyId={1} />);
    await Promise.race([waitForNotify('onLayout1'), wait(1000)]);
    expect(result.height).toBe(200);
  });

  test('is dispatched to the registered event handler', async () => {
    const result = {} as TestResult;
    await render(<TestComponent result={result} notifyId={2} />);
    await Promise.race([waitForNotify('animatedOnLayout2'), wait(1000)]);
    expect(result.animatedHandlerCalled).toBe(true);
  });
});

const styles = StyleSheet.create({
  smallBox: {
    width: 100,
    height: 100,
    backgroundColor: 'pink',
  },
});

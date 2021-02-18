import React from 'react';
import { View, Button } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

const TestComponent1 = () => {
  const sv = useSharedValue(1);
  return <View testID="view">{sv.value}</View>;
};

function TestComponent2() {
  const sv = useSharedValue(1);

  return (
    <View>
      <View testID="view">{sv.value}</View>
      <Button
        testID="button"
        title="run"
        onPress={() => {
          sv.value = sv.value + 1;
        }}
      />
    </View>
  );
}

function TestComponent3() {
  const sv = useSharedValue(1);
  const style = useAnimatedStyle(() => {
    return { width: sv.value };
  });

  return (
    <View>
      <View testID="view" style={[{ color: 'red' }, style]}></View>
      <Button
        testID="button"
        title="run"
        onPress={() => {
          sv.value = sv.value + 1;
        }}
      />
    </View>
  );
}

describe('SharedValue basic render', () => {
  test('contains default value', () => {
    const { getByTestId } = render(<TestComponent1 />);
    const view = getByTestId('view');
    expect(view.children[0]).toBe('1');
  });

  test('no changes value after click', () => {
    const { getByTestId } = render(<TestComponent2 />);
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view.children[0]).toBe('1');
    fireEvent.press(button);
    expect(view.children[0]).toBe('1');
    fireEvent.press(button);
    expect(view.children[0]).toBe('1');
  });

  test('changes value after click', () => {
    const { getByTestId } = render(<TestComponent3 />);
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view).toHaveAnimatedStyle({ color: 'red', width: 1 });
    fireEvent.press(button);
    expect(view).toHaveAnimatedStyle({ color: 'red', width: 2 });
    fireEvent.press(button);
    expect(view).toHaveAnimatedStyle({ color: 'red', width: 3 });
  });
});

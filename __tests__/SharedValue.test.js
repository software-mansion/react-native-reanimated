import React from 'react';
import { View, Button } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { useSharedValue } from '../src';

const ViewTestComponent = () => {
  const sv = useSharedValue(1);
  return <View testID="view">{sv.value}</View>;
};

function TestComponentWithSV() {
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

describe('SharedValue basic render', () => {
  test('contains default value', () => {
    const { getByTestId } = render(<ViewTestComponent />);
    const view = getByTestId('view');
    expect(view.children[0]).toBe('1');
  });

  test('no changes value after click', () => {
    const { getByTestId } = render(<TestComponentWithSV />);
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view.children[0]).toBe('1');
    fireEvent.press(button);
    expect(view.children[0]).toBe('1');
    fireEvent.press(button);
    expect(view.children[0]).toBe('1');
  });
});

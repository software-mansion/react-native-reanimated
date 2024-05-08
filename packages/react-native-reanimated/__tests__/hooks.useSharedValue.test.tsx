import React from 'react';
import renderer from 'react-test-renderer';
import Animated, { useSharedValue } from '../src';

jest.mock('../src/reanimated2/NativeReanimated/NativeReanimated');

describe('useSharedValue', () => {
  it('retains value on rerender', () => {
    // Given
    const initialValue = 0;
    const updatedValue = 1;

    interface Props {
      key: string;
      value: number;
    }

    function TestComponent(props: Props) {
      const opacity = useSharedValue(props.value);
      return <Animated.View style={{ opacity: opacity.value }} />;
    }

    // When rendering with initial value
    const wrapper = renderer.create(
      <TestComponent key="box" value={initialValue} />
    );

    expect(
      typeof wrapper.root.children[0] !== 'string'
        ? wrapper.root.children[0].props.style.opacity
        : false
    ).toBe(initialValue);

    // When rendering with updated value
    wrapper.update(<TestComponent key="box" value={updatedValue} />);

    expect(
      typeof wrapper.root.children[0] !== 'string'
        ? wrapper.root.children[0].props.style.opacity
        : false
    ).toBe(initialValue);
  });
});

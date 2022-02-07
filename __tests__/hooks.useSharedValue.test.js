import React from 'react';
import renderer from 'react-test-renderer';
import Animated, { useSharedValue } from '../src/Animated';

jest.mock('../src/ReanimatedEventEmitter');
jest.mock('../src/ReanimatedModule');
jest.mock('../src/reanimated2/NativeReanimated/NativeReanimated');

describe('useSharedValue', () => {
  it('retains value on rerender', () => {
    // Given
    const initialValue = 0;
    const updatedValue = 1;

    function TestComponent(props) {
      const opacity = useSharedValue(props.value);
      return <Animated.View style={{ opacity: opacity.value }} />;
    }

    // When rendering with initial value
    const wrapper = renderer.create(
      <TestComponent key="box" value={initialValue} />
    );

    expect(wrapper.root.children[0].props.style.opacity).toBe(initialValue);

    // When rendering with updated value
    wrapper.update(<TestComponent key="box" value={updatedValue} />);

    expect(wrapper.root.children[0].props.style.opacity).toBe(initialValue);
  });
});

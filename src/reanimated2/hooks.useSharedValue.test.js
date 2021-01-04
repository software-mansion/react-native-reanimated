import React from 'react';
import renderer from 'react-test-renderer';
import Animated, { useSharedValue } from '../Animated';

jest.mock('../ReanimatedEventEmitter');
jest.mock('../ReanimatedModule');
jest.mock('./NativeReanimated');

describe('useSharedValue', () => {
  it('update value when shouldRebuild = true', () => {
    // Given
    const shouldRebuild = true;
    const initialValue = 0;
    const updatedValue = 1;

    function TestComponent(props) {
      const opacity = useSharedValue(props.value, shouldRebuild);
      return <Animated.View style={{ opacity: opacity.value }} />;
    }

    // When rendering with initial value
    const wrapper = renderer.create(
      <TestComponent key="box" value={initialValue} />
    );

    expect(wrapper.root.children[0].props.style.opacity).toBe(initialValue);

    // When rendering with updated value
    wrapper.update(<TestComponent key="box" value={updatedValue} />);

    expect(wrapper.root.children[0].props.style.opacity).toBe(updatedValue);
  });

  it('retains value when shouldRebuild = false', () => {
    // Given
    const shouldRebuild = false;
    const initialValue = 0;
    const updatedValue = 1;

    function TestComponent(props) {
      const opacity = useSharedValue(props.value, shouldRebuild);
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

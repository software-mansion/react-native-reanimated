import React from 'react';
import renderer, { act } from 'react-test-renderer';

import Animated, { useSharedValue } from '../src';

describe('useSharedValue', () => {
  it('retains value on rerender', async () => {
    // Given
    const initialValue = 0;
    const updatedValue = 1;

    interface Props {
      key: string;
      value: number;
    }

    function TestComponent(props: Props) {
      const [opacity, setOpacity] = React.useState(props.value);
      const opacitySv = useSharedValue(props.value);

      React.useEffect(() => setOpacity(opacitySv.value), [opacitySv]);

      return <Animated.View style={{ opacity }} />;
    }

    let wrapper!: renderer.ReactTestRenderer;

    // When rendering with initial value
    await act(() => {
      wrapper = renderer.create(
        <TestComponent key="box" value={initialValue} />
      );
    });

    const initialChild = wrapper.root.children[0];
    expect(
      typeof initialChild !== 'string'
        ? initialChild.props.style.opacity
        : false
    ).toBe(initialValue);

    // When rendering with updated value
    await act(() => {
      wrapper.update(<TestComponent key="box" value={updatedValue} />);
    });

    const updatedChild = wrapper.root.children[0];
    expect(
      typeof updatedChild !== 'string'
        ? updatedChild.props.style.opacity
        : false
    ).toBe(initialValue);
  });
});

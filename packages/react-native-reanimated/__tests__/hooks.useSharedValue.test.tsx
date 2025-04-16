import { render } from '@testing-library/react-native';
import React from 'react';

import Animated, { useSharedValue } from '../src';

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
      const [opacity, setOpacity] = React.useState(props.value);
      const opacitySv = useSharedValue(props.value);

      React.useEffect(() => setOpacity(opacitySv.value), [opacitySv]);

      return <Animated.View style={{ opacity }} testID={'AnimatedView'} />;
    }

    const component = render(<TestComponent key="box" value={initialValue} />);

    const animatedView = component.getByTestId('AnimatedView');

    expect(animatedView.props.style[0].opacity).toBe(initialValue);

    component.update(<TestComponent key="box" value={updatedValue} />);
    const updatedChild = component.getByTestId('AnimatedView');

    expect(updatedChild.props.style[0].opacity).toBe(initialValue);

    const rendered = render(
      <TestComponent key="box" value={updatedValue} />
    ).toJSON();
    expect(rendered).toMatchSnapshot();
  });
});

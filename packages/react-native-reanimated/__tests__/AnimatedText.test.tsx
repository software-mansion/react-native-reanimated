import { render, screen } from '@testing-library/react-native';

import type * as ReanimatedModule from '../src';

const Reanimated = jest.requireActual<typeof ReanimatedModule>('../src/mock');
const Animated = Reanimated.default;
const { useSharedValue } = Reanimated;

describe('Animated.Text in the Jest mock', () => {
  it('renders a shared value child', () => {
    function Example() {
      const sv = useSharedValue(42);
      return <Animated.Text>{sv}</Animated.Text>;
    }
    render(<Example />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('renders a shared value between plain children', () => {
    function Example() {
      const sv = useSharedValue(42);
      return <Animated.Text>Value: {sv}%</Animated.Text>;
    }
    render(<Example />);
    expect(screen.getByText('Value: 42%')).toBeTruthy();
  });

  it('renders plain children unchanged', () => {
    render(<Animated.Text>Hello</Animated.Text>);
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});

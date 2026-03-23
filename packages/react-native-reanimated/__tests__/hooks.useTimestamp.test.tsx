import { render } from '@testing-library/react-native';
import React from 'react';

import Animated, { useTimestamp } from '../src';

const mockSetActive = jest.fn();
const mockFrameCallback = {
  setActive: mockSetActive,
  isActive: false,
  callbackId: -1,
};

jest.mock('../src/hook/useFrameCallback', () => {
  const original = jest.requireActual('../src/hook/useFrameCallback');
  return {
    ...original,
    useFrameCallback: jest.fn(() => mockFrameCallback),
  };
});

describe('useTimestamp', () => {
  beforeEach(() => {
    mockSetActive.mockClear();
  });

  test('initializes to 0', () => {
    function TestComponent() {
      const timestamp = useTimestamp(false);
      return (
        <Animated.View
          style={{ opacity: timestamp.value }}
          testID={'AnimatedView'}
        />
      );
    }

    const component = render(<TestComponent />);
    const view = component.getByTestId('AnimatedView');
    expect(view.props.style[0].opacity).toBe(0);
  });

  test('defaults isActive to true', () => {
    function TestComponent() {
      useTimestamp();
      return <Animated.View testID={'AnimatedView'} />;
    }

    render(<TestComponent />);
    expect(mockSetActive).toHaveBeenCalledWith(true);
  });

  test('respects isActive=false', () => {
    function TestComponent() {
      useTimestamp(false);
      return <Animated.View testID={'AnimatedView'} />;
    }

    render(<TestComponent />);
    expect(mockSetActive).toHaveBeenCalledWith(false);
  });

  test('calls setActive when isActive toggles', () => {
    function TestComponent({ active }: { active: boolean }) {
      useTimestamp(active);
      return <Animated.View testID={'AnimatedView'} />;
    }

    const component = render(<TestComponent active={false} />);
    expect(mockSetActive).toHaveBeenLastCalledWith(false);

    mockSetActive.mockClear();
    component.update(<TestComponent active={true} />);
    expect(mockSetActive).toHaveBeenCalledWith(true);
  });
});

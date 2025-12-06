import {
  act,
  fireEvent,
  render as originalRender,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import { type ReactElement, StrictMode, useState } from 'react';
import { Button, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

describe('Layout Animations', () => {
  describe.each([
    ['without StrictMode', false],
    ['with StrictMode', true],
  ])('%s', (_, strictMode) => {
    const render = (
      component: ReactElement,
      options?: RenderOptions
    ): RenderResult => {
      const wrappedComponent = strictMode ? (
        <StrictMode>{component}</StrictMode>
      ) : (
        component
      );
      return originalRender(wrappedComponent, options);
    };

    beforeAll(() => {
      jest.useFakeTimers();
    });

    describe('exiting', () => {
      function Example() {
        const [visible, setVisible] = useState(false);

        return (
          <>
            <Button title="Toggle" onPress={() => setVisible(!visible)} />
            {visible && (
              <Animated.View exiting={FadeOut}>
                <View
                  style={{ width: 100, height: 100, backgroundColor: 'red' }}
                  testID="box"
                />
              </Animated.View>
            )}
          </>
        );
      }

      test('view stays visible after being mounted', () => {
        const screen = render(<Example />);

        // The box should be initially hidden
        expect(screen.queryByTestId('box')).toBeNull();

        // Click to show the element
        const button = screen.getByRole('button', { name: 'Toggle' });
        act(() => {
          fireEvent.click(button);
        });

        // The box should be visible now
        expect(screen.queryByTestId('box')).not.toBeNull();

        // The box should stay visible after the timeout
        jest.advanceTimersByTime(500);
        expect(screen.queryByTestId('box')).not.toBeNull();
      });
    });
  });
});

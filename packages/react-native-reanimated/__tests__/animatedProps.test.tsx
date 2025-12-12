import { fireEvent, render } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import React from 'react';
import type { TextInputProps } from 'react-native';
import { Button, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';

import type { JestAnimatedStyleHandle } from '../src/hook/commonTypes';

const animationDuration = 100;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface BaseTextInputComponentProps {
  animatedProps: ComponentProps<typeof AnimatedTextInput>['animatedProps'];
  onPress?: () => void;
}

function BaseTextInputComponent({
  animatedProps,
  onPress,
}: BaseTextInputComponentProps) {
  return (
    <View>
      <AnimatedTextInput testID="text" animatedProps={animatedProps} />
      <Button testID="button" onPress={onPress} title="Click me" />
    </View>
  );
}

describe('animatedProps', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Single animated props object', () => {
    function TextInputTestComponent() {
      const width = useSharedValue(20);

      const animatedProps = useAnimatedProps(() => ({
        text: `Box width: ${width.value}`,
        defaultValue: `Box width: ${width.value}`,
      }));

      const handlePress = () => {
        width.value += 10;
      };

      return (
        <BaseTextInputComponent
          animatedProps={animatedProps}
          onPress={handlePress}
        />
      );
    }

    test('matches snapshot', () => {
      const rendered = render(<TextInputTestComponent />).toJSON();
      expect(rendered).toMatchSnapshot();
    });

    test('updates text on button press', () => {
      const { getByTestId } = render(<TextInputTestComponent />);
      const textInput = getByTestId('text');
      const button = getByTestId('button');

      expect(textInput).toHaveAnimatedProps({ text: 'Box width: 20' });

      fireEvent.press(button);
      jest.advanceTimersByTime(animationDuration);

      expect(textInput).toHaveAnimatedProps({ text: 'Box width: 30' });
    });

    test('cleans up a single animated props object on unmount', () => {
      const removeSpy = jest.fn();

      function DetachSingleAnimatedPropsComponent() {
        const animatedProps = useAnimatedProps(() => ({
          placeholder: 'Single animated props',
        }));

        React.useEffect(() => {
          const handle =
            animatedProps as JestAnimatedStyleHandle<TextInputProps>;
          const spy = jest
            .spyOn(handle.viewDescriptors, 'remove')
            .mockImplementation(removeSpy);

          return () => {
            spy.mockRestore();
          };
        }, [animatedProps]);

        return <AnimatedTextInput animatedProps={animatedProps} />;
      }

      const { unmount } = render(<DetachSingleAnimatedPropsComponent />);

      unmount();

      expect(removeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple animated props objects', () => {
    function TextInputTestComponent() {
      const width = useSharedValue(20);
      const counter = useSharedValue(0);

      const animatedProps1 = useAnimatedProps(() => ({
        text: `Box width: ${width.value}`,
        defaultValue: `Box width: ${width.value}`,
      }));

      const animatedProps2 = useAnimatedProps(() => ({
        placeholder: `Click count: ${counter.value}`,
      }));

      const handlePress = () => {
        width.value += 10;
        counter.value += 1;
      };

      return (
        <BaseTextInputComponent
          animatedProps={[animatedProps1, animatedProps2]}
          onPress={handlePress}
        />
      );
    }

    test('matches snapshot', () => {
      const rendered = render(<TextInputTestComponent />).toJSON();
      expect(rendered).toMatchSnapshot();
    });

    test('merges multiple animated props objects', () => {
      const { getByTestId } = render(<TextInputTestComponent />);
      const textInput = getByTestId('text');
      const button = getByTestId('button');

      expect(textInput).toHaveAnimatedProps({
        text: 'Box width: 20',
        placeholder: 'Click count: 0',
      });

      fireEvent.press(button);
      jest.advanceTimersByTime(animationDuration);

      expect(textInput).toHaveAnimatedProps({
        text: 'Box width: 30',
        placeholder: 'Click count: 1',
      });
    });

    test('later animated props override earlier animated props when overlapping and when both are updated', () => {
      function OverlappingPropsComponent() {
        const value1 = useSharedValue('first');
        const value2 = useSharedValue('second');

        const animatedProps1 = useAnimatedProps(() => ({
          text: value1.value,
          placeholder: 'First placeholder',
        }));

        const animatedProps2 = useAnimatedProps(() => ({
          text: value2.value,
          placeholder: 'Second placeholder',
        }));

        const handlePress = () => {
          value1.value = 'updated first';
          value2.value = 'updated second';
        };

        return (
          <BaseTextInputComponent
            animatedProps={[animatedProps1, animatedProps2]}
            onPress={handlePress}
          />
        );
      }

      const { getByTestId } = render(<OverlappingPropsComponent />);
      const textInput = getByTestId('text');
      const button = getByTestId('button');

      // Later props (animatedProps2) should override earlier ones (animatedProps1)
      expect(textInput).toHaveAnimatedProps({
        text: 'second',
        placeholder: 'Second placeholder',
      });

      fireEvent.press(button);
      jest.advanceTimersByTime(animationDuration);

      expect(textInput).toHaveAnimatedProps({
        text: 'updated second',
        placeholder: 'Second placeholder',
      });
    });

    test('last updated animated props override all other animated props', () => {
      function OverlappingPropsComponent() {
        const value1 = useSharedValue(10);
        const value2 = useSharedValue(20);

        const animatedProps1 = useAnimatedProps(() => ({
          text: `First: ${value1.value}`,
          placeholder: 'First placeholder',
        }));

        const animatedProps2 = useAnimatedProps(() => ({
          text: `Second: ${value2.value}`,
          placeholder: 'Second placeholder',
        }));

        const handlePress = () => {
          // Update the shared value to show that order does not matter
          value1.value += 5;
        };

        return (
          <BaseTextInputComponent
            animatedProps={[animatedProps1, animatedProps2]}
            onPress={handlePress}
          />
        );
      }

      const { getByTestId } = render(<OverlappingPropsComponent />);
      const textInput = getByTestId('text');
      const button = getByTestId('button');

      // Initially, the second animated props are used
      expect(textInput).toHaveAnimatedProps({
        text: 'Second: 20',
        placeholder: 'Second placeholder',
      });

      fireEvent.press(button);
      jest.advanceTimersByTime(animationDuration);

      // After updating value1, used in the first animated props, the props from this animated props are used
      expect(textInput).toHaveAnimatedProps({
        text: 'First: 15',
        placeholder: 'First placeholder', // this also changes as the entire returned object is used
      });
    });

    test('cleans up all animated props objects on unmount', () => {
      const removeMocks = [jest.fn(), jest.fn(), jest.fn()];

      function DetachMultipleAnimatedPropsComponent() {
        const animatedProps1 = useAnimatedProps(() => ({
          placeholder: 'First animated props',
        }));
        const animatedProps2 = useAnimatedProps(() => ({
          inputMode: 'numeric' as const,
        }));
        const animatedProps3 = useAnimatedProps(() => ({
          pointerEvents: 'auto' as const,
        }));

        React.useEffect(() => {
          const handles = [animatedProps1, animatedProps2, animatedProps3];
          const spies = handles.map((animatedProps, index) =>
            jest
              .spyOn(
                (animatedProps as JestAnimatedStyleHandle<TextInputProps>)
                  .viewDescriptors,
                'remove'
              )
              .mockImplementation(removeMocks[index])
          );

          return () => {
            spies.forEach((spy) => spy.mockRestore());
          };
        }, [animatedProps1, animatedProps2, animatedProps3]);

        return (
          <BaseTextInputComponent
            animatedProps={[[animatedProps1], animatedProps2, animatedProps3]}
          />
        );
      }

      const { unmount } = render(<DetachMultipleAnimatedPropsComponent />);

      unmount();

      removeMocks.forEach((mock) => {
        expect(mock).toHaveBeenCalled();
      });
    });
  });
});

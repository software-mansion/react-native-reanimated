import { fireEvent, render } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import React from 'react';
import type { TextInputProps } from 'react-native';
import { Button, TextInput, View } from 'react-native';
import Animated, {
  type CSSAnimationProperties,
  type CSSTransitionProperties,
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

import type { JestAnimatedStyleHandle } from '../src/hook/commonTypes';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-svg', () => require('../mock'));

const animationDuration = 100;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
      const removeMocks: jest.Mock[] = [];

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
          const spies = handles.map((animatedProps) => {
            const mock = jest.fn();
            removeMocks.push(mock);
            return jest
              .spyOn(
                (animatedProps as JestAnimatedStyleHandle<TextInputProps>)
                  .viewDescriptors,
                'remove'
              )
              .mockImplementation(mock);
          });

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

  describe('Plain object animatedProps', () => {
    function PlainObjectComponent({
      animatedProps,
    }: {
      animatedProps: Record<string, unknown>;
    }) {
      return (
        <Svg height="100" width="100">
          <AnimatedCircle
            testID="circle"
            cx="50"
            cy="50"
            animatedProps={animatedProps}
          />
        </Svg>
      );
    }

    test('forwards values to the underlying component on initial render', () => {
      const { getByTestId } = render(
        <PlainObjectComponent animatedProps={{ r: 20, fill: 'blue' }} />
      );

      const circle = getByTestId('circle');
      expect(circle.props.r).toBe(20);
      expect(circle.props.fill).toBe('blue');
    });

    test('updates the rendered values when animatedProps change', () => {
      const { getByTestId, rerender } = render(
        <PlainObjectComponent animatedProps={{ r: 20, fill: 'blue' }} />
      );

      rerender(<PlainObjectComponent animatedProps={{ r: 50, fill: 'red' }} />);
      expect(getByTestId('circle').props.r).toBe(50);
      expect(getByTestId('circle').props.fill).toBe('red');
    });

    test('does not forward CSS transition config keys', () => {
      const transitionConfig: Required<CSSTransitionProperties> = {
        transitionProperty: 'all',
        transitionDuration: '500ms',
        transitionTimingFunction: 'ease-in',
        transitionDelay: '0ms',
        transitionBehavior: 'normal',
        transition: 'all 500ms ease-in 0ms',
      };

      const { getByTestId } = render(
        <PlainObjectComponent animatedProps={transitionConfig} />
      );

      const circle = getByTestId('circle');
      for (const key of Object.keys(transitionConfig)) {
        expect(circle.props[key]).toBeUndefined();
      }
    });

    test('does not forward CSS animation config keys', () => {
      const animationConfig: Required<CSSAnimationProperties> = {
        animationName: 'none',
        animationDuration: '1s',
        animationTimingFunction: 'linear',
        animationDelay: '0ms',
        animationIterationCount: 1,
        animationDirection: 'normal',
        animationFillMode: 'none',
        animationPlayState: 'running',
      };

      const { getByTestId } = render(
        <PlainObjectComponent animatedProps={animationConfig} />
      );

      const circle = getByTestId('circle');
      for (const key of Object.keys(animationConfig)) {
        expect(circle.props[key]).toBeUndefined();
      }
    });
  });

  describe('Precedence over inline props', () => {
    // animatedProps must win over inline props for the same key, regardless
    // of JSX attribute order. Order is therefore load-bearing — do not
    // reorder the JSX attributes in the tests below.

    describe('useAnimatedProps', () => {
      test('overrides inline value (animatedProps declared first)', () => {
        function TestComponent() {
          const animatedProps = useAnimatedProps(() => ({
            placeholder: 'from-animated-props',
          }));
          return (
            <AnimatedTextInput
              testID="text"
              animatedProps={animatedProps}
              placeholder="from-inline"
            />
          );
        }

        const { getByTestId } = render(<TestComponent />);
        const textInput = getByTestId('text');
        expect(textInput.props.placeholder).toBe('from-animated-props');
      });

      test('overrides inline value (inline declared first)', () => {
        function TestComponent() {
          const animatedProps = useAnimatedProps(() => ({
            placeholder: 'from-animated-props',
          }));
          return (
            <AnimatedTextInput
              testID="text"
              placeholder="from-inline"
              animatedProps={animatedProps}
            />
          );
        }

        const { getByTestId } = render(<TestComponent />);
        const textInput = getByTestId('text');
        expect(textInput.props.placeholder).toBe('from-animated-props');
      });
    });

    describe('Plain object animatedProps', () => {
      test('overrides inline value (animatedProps declared first)', () => {
        const { getByTestId } = render(
          <Svg height="100" width="100">
            <AnimatedCircle
              testID="circle"
              cx="50"
              cy="50"
              animatedProps={{ r: 10, fill: 'blue' }}
              r={40}
              fill="red"
            />
          </Svg>
        );

        const circle = getByTestId('circle');
        expect(circle.props.r).toBe(10);
        expect(circle.props.fill).toBe('blue');
      });

      test('overrides inline value (inline declared first)', () => {
        const { getByTestId } = render(
          <Svg height="100" width="100">
            <AnimatedCircle
              testID="circle"
              cx="50"
              cy="50"
              r={40}
              fill="red"
              animatedProps={{ r: 10, fill: 'blue' }}
            />
          </Svg>
        );

        const circle = getByTestId('circle');
        expect(circle.props.r).toBe(10);
        expect(circle.props.fill).toBe('blue');
      });

      test('inline props are kept for keys not present in animatedProps', () => {
        const { getByTestId } = render(
          <Svg height="100" width="100">
            <AnimatedCircle
              testID="circle"
              cx="50"
              cy="50"
              r={40}
              fill="red"
              animatedProps={{ r: 10 }}
            />
          </Svg>
        );

        const circle = getByTestId('circle');
        expect(circle.props.r).toBe(10);
        expect(circle.props.fill).toBe('red');
      });
    });
  });
});

import { render } from '@testing-library/react-native';
import React from 'react';
import { TextInput } from 'react-native';
import Animated, { useSharedValue, withTiming } from '../src';

jest.useFakeTimers();

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

describe('Inline SharedValues in animatedProps', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should support inline SharedValues in animatedProps', () => {
    function TestComponent() {
      const sharedValue = useSharedValue('Initial text');
      const placeholderValue = useSharedValue('Enter text');
      const editableValue = useSharedValue(true);

      return (
        <AnimatedTextInput
          testID="text-input"
          animatedProps={{
            value: sharedValue,
            placeholder: placeholderValue,
            editable: editableValue,
          }}
        />
      );
    }

    const { getByTestId } = render(<TestComponent />);
    const textInput = getByTestId('text-input');
    
    // Inline SharedValues should be resolved in jestAnimatedProps
    // Use toHaveAnimatedProps matcher for cleaner tests
    expect(textInput).toHaveAnimatedProps({
      value: 'Initial text',
      placeholder: 'Enter text',
      editable: true,
    });
  });

  it('should support nested arrays with inline SharedValues', () => {
    function TestComponent() {
      const value1 = useSharedValue('Text 1');
      const value2 = useSharedValue('Text 2');
      const editableValue = useSharedValue(false);

      return (
        <AnimatedTextInput
          testID="text-input"
          animatedProps={[
            {
              value: value1,
            },
            [
              {
                placeholder: value2,
                editable: editableValue,
              },
            ],
          ]}
        />
      );
    }

    const { getByTestId } = render(<TestComponent />);
    const textInput = getByTestId('text-input');
    
    // Nested arrays with inline SharedValues should be flattened and resolved
    // Use toHaveAnimatedProps matcher for cleaner tests
    expect(textInput).toHaveAnimatedProps({
      value: 'Text 1',
      placeholder: 'Text 2',
      editable: false,
    });
  });

  it('should support mixed SharedValues and regular values', () => {
    function TestComponent() {
      const sharedValue = useSharedValue('Dynamic text');

      return (
        <AnimatedTextInput
          testID="text-input"
          animatedProps={{
            value: sharedValue,
            placeholder: 'Static placeholder',
            maxLength: 100,
          }}
        />
      );
    }

    const { getByTestId } = render(<TestComponent />);
    const textInput = getByTestId('text-input');
    
    // Both inline SharedValues and static values should work together
    // Use toHaveAnimatedProps matcher for cleaner tests
    expect(textInput).toHaveAnimatedProps({
      value: 'Dynamic text',
      placeholder: 'Static placeholder',
      maxLength: 100,
    });
  });

  it('should update props when SharedValue changes', () => {
    function TestComponent() {
      const textValue = useSharedValue('Initial');
      const editableValue = useSharedValue(true);

      React.useEffect(() => {
        // Update values after mount
        textValue.value = 'Updated';
        editableValue.value = false;
      }, [textValue, editableValue]);

      return (
        <AnimatedTextInput
          testID="text-input"
          animatedProps={{
            value: textValue,
            editable: editableValue,
          }}
        />
      );
    }

    const { getByTestId } = render(<TestComponent />);
    const textInput = getByTestId('text-input');
    
    // Check initial inline SharedValues
    // Use toHaveAnimatedProps matcher for cleaner tests
    expect(textInput).toHaveAnimatedProps({
      value: 'Initial',
      editable: true,
    });

    // Run effects and check updated values
    jest.runAllTimers();
    
    // Inline SharedValues should update when their values change
    expect(textInput).toHaveAnimatedProps({
      value: 'Updated',
      editable: false,
    });
  });

  it('should handle animated transitions in props', () => {
    function TestComponent() {
      const maxLength = useSharedValue(50);

      React.useEffect(() => {
        // Animate value change
        maxLength.value = withTiming(100, { duration: 500 });
      }, [maxLength]);

      return (
        <AnimatedTextInput
          testID="text-input"
          animatedProps={{
            maxLength,
            placeholder: 'Enter text',
          }}
        />
      );
    }

    const { getByTestId } = render(<TestComponent />);
    const textInput = getByTestId('text-input');
    
    // Check initial inline SharedValue
    // Use toHaveAnimatedProps matcher for cleaner tests
    expect(textInput).toHaveAnimatedProps({
      maxLength: 50,
      placeholder: 'Enter text',
    });

    // Run animation to completion
    jest.advanceTimersByTime(500);
    jest.runAllTimers();
    
    // Inline SharedValue should animate to final value
    expect(textInput).toHaveAnimatedProps({
      maxLength: 100,
      placeholder: 'Enter text',
    });
  });

  it('should extract SharedValues from deeply nested objects in animatedProps', () => {
    function TestComponent() {
      const nestedValue = useSharedValue('nested');
      const deepValue = useSharedValue(42);

      return (
        <AnimatedTextInput
          testID="text-input"
          animatedProps={[
            {
              placeholder: 'Static',
              value: nestedValue,
            },
            [
              {
                maxLength: deepValue,
              },
            ],
          ]}
        />
      );
    }

    const { getByTestId } = render(<TestComponent />);
    const textInput = getByTestId('text-input');

    // Deeply nested inline SharedValues should be extracted
    // Use toHaveAnimatedProps matcher for cleaner tests
    expect(textInput).toHaveAnimatedProps({
      placeholder: 'Static',
      value: 'nested',
      maxLength: 42,
    });
  });
});

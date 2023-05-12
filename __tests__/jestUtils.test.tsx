import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from '../src';
import { render } from '@testing-library/react-native';

describe('jestUtils', () => {
  it('differentiates matching with shouldMatchAllProps option with toHaveAnimatedStyle', () => {
    const AnimatedComponent = () => {
      const style = useAnimatedStyle(() => {
        return {
          flex: 1,
        };
      });

      return (
        <View>
          <Animated.View
            testID="view"
            style={[{ backgroundColor: 'black' }, style]}
          />
        </View>
      );
    };

    const view = render(<AnimatedComponent />).getByTestId('view');

    expect(view).toHaveAnimatedStyle(
      { flex: 1 },
      { shouldMatchAllProps: false }
    );

    expect(view).not.toHaveAnimatedStyle(
      { flex: 1 },
      { shouldMatchAllProps: true }
    );

    expect(view).toHaveAnimatedStyle(
      { flex: 1, backgroundColor: 'black' },
      { shouldMatchAllProps: false }
    );

    expect(view).toHaveAnimatedStyle(
      { flex: 1, backgroundColor: 'black' },
      { shouldMatchAllProps: true }
    );

    expect(view).not.toHaveAnimatedStyle(
      { flex: 1, backgroundColor: 'black', width: 100 },
      { shouldMatchAllProps: true }
    );

    expect(view).not.toHaveAnimatedStyle(
      { flex: 1, backgroundColor: 'black', width: 100 },
      { shouldMatchAllProps: false }
    );
  });
});

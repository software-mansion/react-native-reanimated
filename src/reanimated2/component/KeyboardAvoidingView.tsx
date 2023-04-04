import React, { forwardRef } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import ReanimatedView from './View';
import { useAnimatedKeyboard, useAnimatedStyle } from '../';

type Props = ViewProps & {
  /**
   * Specify how to react to the presence of the keyboard.
   */
  behavior?: 'height' | 'position' | 'padding';

  /**
   * Style of the content container when `behavior` is 'position'.
   */
  contentContainerStyle?: ViewProps['style'];

  /**
   * Controls whether this `KeyboardAvoidingView` instance should take effect.
   * This is useful when more than one is on the screen. Defaults to true.
   */
  enabled?: boolean;

  /**
   * Distance between the top of the user screen and the React Native view. This
   * may be non-zero in some cases. Defaults to 0.
   */
  keyboardVerticalOffset?: number;
};

/**
 * View that moves out of the way when the keyboard appears by automatically
 * adjusting its height, position, or bottom padding.
 */
const KeyboardAvoidingView = forwardRef<View, React.PropsWithChildren<Props>>(
  (
    {
      behavior,
      children,
      contentContainerStyle,
      enabled = true,
      // eslint-disable-next-line no-unused-vars
      keyboardVerticalOffset = 0,
      style,
      ...props
    },
    ref
  ) => {
    const keyboard = useAnimatedKeyboard();

    const animatedStyle = useAnimatedStyle(() => {
      // we use `enabled === true` to be 100% compatible with original implementation
      const bottomHeight =
        enabled === true
          ? Math.max(keyboard.height.value - keyboardVerticalOffset, 0)
          : 0;

      switch (behavior) {
        case 'height':
          return {
            height: bottomHeight,
            flex: 0,
          };

        case 'position':
          return {
            bottom: bottomHeight,
          };

        case 'padding':
          return { paddingBottom: bottomHeight };

        default:
          return {};
      }
    });

    if (behavior === 'position') {
      return (
        <ReanimatedView
          ref={ref}
          // @ts-expect-error - style is not compatible with Reanimated.View
          style={style}
          {...props}>
          <ReanimatedView
            style={StyleSheet.compose(contentContainerStyle, animatedStyle)}>
            {children}
          </ReanimatedView>
        </ReanimatedView>
      );
    }

    return (
      <ReanimatedView
        ref={ref}
        style={!behavior ? style : StyleSheet.compose(style, animatedStyle)}
        {...props}>
        {children}
      </ReanimatedView>
    );
  }
);

export default KeyboardAvoidingView;

import React, { forwardRef, useCallback } from 'react';
import type {
  KeyboardAvoidingViewProps,
  LayoutRectangle,
  View,
  ViewProps,
} from 'react-native';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { AnimatedView } from './View';
import {
  useAnimatedKeyboard,
  useAnimatedStyle,
  runOnUI,
  useSharedValue,
} from '../';

let useHeaderHeight: () => number;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useHeaderHeight = require('@react-navigation/elements').useHeaderHeight;
} catch (e) {
  useHeaderHeight = () => 0;
}

/**
 * View that moves out of the way when the keyboard appears by automatically
 * adjusting its height, position, or bottom padding.
 */
export const ReanimatedKeyboardAvoidingView = forwardRef<
  View,
  React.PropsWithChildren<KeyboardAvoidingViewProps>
>(
  (
    {
      behavior,
      children,
      contentContainerStyle,
      enabled = true,
      keyboardVerticalOffset = 0,
      style,
      onLayout,
      ...props
    },
    ref
  ) => {
    const initialFrameLayout = useSharedValue<LayoutRectangle | null>(null);
    const keyboard = useAnimatedKeyboard();
    const screenHeight = useWindowDimensions().height;
    const headerHeight = useHeaderHeight();

    const onLayoutWorklet = useCallback(
      (layout: LayoutRectangle) => {
        'worklet';
        if (initialFrameLayout.value == null) {
          initialFrameLayout.value = layout;
        }
      },
      [initialFrameLayout]
    );

    const handleOnLayout = useCallback<NonNullable<ViewProps['onLayout']>>(
      (event) => {
        runOnUI(onLayoutWorklet)(event.nativeEvent.layout);

        if (onLayout) {
          onLayout(event);
        }
      },
      [onLayout, onLayoutWorklet]
    );

    const getBackwardCompatibleBottomHeight = useCallback(
      (keyboardHeight: number) => {
        'worklet';
        if (initialFrameLayout.value == null) {
          return 0;
        }

        /*
        We calculate how much of the view to move by taking sum of keyboard's and view's heights
        (keyboardHeight + initialFrame.value.height) and substracting how much space they both should actually
        occupy (screenHeight - headerHeight - keyboardVerticalOffset). If the result is less than 0 - it means
        that keyboard doesn't cover the view and we don't need to tinker with it.
        */
        const displacement = Math.max(
          keyboardHeight +
            initialFrameLayout.value.height -
            (screenHeight - headerHeight - keyboardVerticalOffset),
          0
        );

        if (behavior === 'height') {
          // in case of changing height, it is just the view height without the amount to move
          return Math.max(initialFrameLayout.value.height - displacement);
        }

        return displacement;
      },
      [
        initialFrameLayout,
        behavior,
        screenHeight,
        headerHeight,
        keyboardVerticalOffset,
      ]
    );

    const animatedStyle = useAnimatedStyle(() => {
      const keyboardHeight = keyboard.height.value;

      const bottom = getBackwardCompatibleBottomHeight(keyboardHeight);

      // we use `enabled === true` to be 100% compatible with original implementation
      const bottomHeight = enabled === true ? bottom : 0;

      switch (behavior) {
        case 'height': {
          const style =
            bottomHeight > 0
              ? {
                  height: bottomHeight,
                  flex: 0,
                }
              : {};
          return style;
        }
        case 'position': {
          return {
            bottom: bottomHeight,
          };
        }
        case 'padding': {
          return {
            paddingBottom: bottomHeight,
          };
        }
        default: {
          return {};
        }
      }
    });

    return (
      <AnimatedView
        ref={ref}
        onLayout={handleOnLayout}
        style={
          behavior === 'position' || behavior === undefined
            ? style
            : [style, animatedStyle]
        }
        {...props}>
        {behavior === 'position' ? (
          <AnimatedView
            style={StyleSheet.compose(contentContainerStyle, animatedStyle)}>
            {children}
          </AnimatedView>
        ) : (
          children
        )}
      </AnimatedView>
    );
  }
);

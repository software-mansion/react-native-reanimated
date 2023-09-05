import React, { forwardRef, useCallback } from 'react';
import type {
  KeyboardAvoidingViewProps,
  LayoutRectangle,
  View,
  ViewProps,
} from 'react-native';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { AnimatedView as ReanimatedView } from './View';
import {
  useAnimatedKeyboard,
  useAnimatedStyle,
  useWorkletCallback,
  runOnUI,
  useSharedValue,
} from '../';

type Props = ViewProps & KeyboardAvoidingViewProps;

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
      keyboardVerticalOffset = 0,
      style,
      onLayout,
      ...props
    },
    ref
  ) => {
    const initialFrame = useSharedValue<LayoutRectangle | null>(null);

    const currentFrame = useSharedValue<LayoutRectangle | null>(null);

    const keyboard = useAnimatedKeyboard();
    const { height: screenHeight } = useWindowDimensions();

    const onLayoutWorklet = useWorkletCallback((layout: LayoutRectangle) => {
      if (initialFrame.value == null) {
        initialFrame.value = layout;
      }

      currentFrame.value = layout;
    });

    const handleOnLayout = useCallback<NonNullable<ViewProps['onLayout']>>(
      (event) => {
        runOnUI(onLayoutWorklet)(event.nativeEvent.layout);

        if (onLayout) {
          onLayout(event);
        }
      },
      [onLayout]
    );

    const getBackwardCompatibleBottomHeight = useWorkletCallback(
      (keyboardHeight: number) => {
        if (currentFrame.value == null || initialFrame.value == null) {
          return 0;
        }

        const keyboardY =
          screenHeight - keyboardHeight - keyboardVerticalOffset;

        if (behavior === 'height') {
          return Math.max(initialFrame.value.height - keyboardHeight, 0);
        }

        return Math.max(
          currentFrame.value.y + currentFrame.value.height - keyboardY,
          0
        );
      }
    );

    const animatedStyle = useAnimatedStyle(() => {
      const keyboardHeight = keyboard.height.value;

      const bottom = getBackwardCompatibleBottomHeight(keyboardHeight);

      // we use `enabled === true` to be 100% compatible with original implementation
      const bottomHeight = enabled === true ? bottom : 0;

      switch (behavior) {
        case 'height':
          const style =
            bottomHeight > 0
              ? {
                  height: bottomHeight,
                  flex: 0,
                }
              : {};
          return style;

        case 'position':
          return {
            bottom: bottomHeight,
          };

        case 'padding':
          return {
            paddingBottom: bottomHeight,
          };

        default:
          return {};
      }
    });

    return (
      <ReanimatedView
        ref={ref}
        onLayout={handleOnLayout}
        style={
          behavior === 'position' || behavior === undefined
            ? style
            : [style, animatedStyle]
        }
        {...props}>
        {behavior === 'position' ? (
          <ReanimatedView
            style={StyleSheet.compose(contentContainerStyle, animatedStyle)}>
            {children}
          </ReanimatedView>
        ) : (
          children
        )}
      </ReanimatedView>
    );
  }
);

export default KeyboardAvoidingView;

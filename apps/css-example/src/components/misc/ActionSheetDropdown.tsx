import { Portal } from '@gorhom/portal';
import type { PropsWithChildren, ReactNode } from 'react';
import { useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  Pressable,
} from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useScrollViewOffset,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing } from '@/theme';

const filterPaddingAndMarginProps = (
  style: StyleProp<ViewStyle>
): [ViewStyle, ViewStyle] => {
  const paddingAndMargin: ViewStyle = {};
  const rest: ViewStyle = {};

  const flattenedStyle = StyleSheet.flatten(style);
  for (const key in flattenedStyle) {
    const k = key as keyof ViewStyle;
    if (key.startsWith('padding') || key.startsWith('margin')) {
      paddingAndMargin[k] = flattenedStyle[k] as undefined;
    } else {
      rest[k] = flattenedStyle[k] as undefined;
    }
  }

  return [paddingAndMargin, rest];
};

export interface ActionSheetOption {
  key: string;
  onPress: () => void;
  render: () => ReactNode;
}

type LayoutMeasurements = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DropdownState = {
  isOpen: boolean;
  toggleMeasurements: ({ sticky?: boolean } & LayoutMeasurements) | null;
};

type ActionSheetDropdownStyleOptions = {
  alignment?: 'left' | 'right';
  sticky?: boolean;
  offsetX?: number;
  offsetY?: number;
  dropdownMaxHeight?: number;
  dropdownZIndex?: number;
  fitInScreen?: boolean;
};

type ActionSheetDropdownProps = PropsWithChildren<{
  options: Array<ActionSheetOption>;
  styleOptions?: {
    backdropOpacity?: number;
    dropdownStyle?: StyleProp<ViewStyle>;
  } & ActionSheetDropdownStyleOptions;
  hitSlop?: number;
  onOpen?: () => void;
  onClose?: () => void;
}>;

export default function ActionSheetDropdown({
  children,
  hitSlop,
  onClose,
  onOpen,
  styleOptions,
  ...contentProps
}: ActionSheetDropdownProps): JSX.Element {
  const containerRef = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const [{ isOpen, toggleMeasurements }, setState] = useState<DropdownState>({
    isOpen: false,
    toggleMeasurements: null,
  });

  const openDropdown = (): void => {
    onOpen?.();

    const containerNode = containerRef?.current;

    if (containerNode) {
      containerNode.measureInWindow((x, y, width, height) => {
        setState({
          isOpen: true,
          toggleMeasurements: {
            height,
            sticky: styleOptions?.sticky,
            width,
            x,
            y: y - (Platform.OS === 'android' ? insets.top : 0),
          },
        });
      });
    }
  };

  const closeDropdown = (): void => {
    onClose?.();
    setState({ isOpen: false, toggleMeasurements: null });
  };

  return (
    <>
      <Pressable hitSlop={hitSlop} onPress={openDropdown}>
        {/* collapsable property prevents removing view on Android. Without this property we were
        getting undefined in measureInWindow callback. (https://reactnative.dev/docs/view.html#collapsable-android) */}
        <View collapsable={false} ref={containerRef}>
          {children}
        </View>
      </Pressable>

      <Portal>
        {isOpen && toggleMeasurements && (
          // This gesture detector blocks scrolling when the dropdown is open
          // (this is needed for Android)
          <GestureDetector
            gesture={Gesture.Pan().onStart(closeDropdown).runOnJS(true)}>
            <View style={StyleSheet.absoluteFill}>
              <Backdrop handleClose={closeDropdown} />
              <DropdownContent
                {...contentProps}
                alignment={styleOptions?.alignment}
                dropdownMaxHeight={styleOptions?.dropdownMaxHeight}
                fitInScreen={styleOptions?.fitInScreen}
                handleClose={closeDropdown}
                offsetX={styleOptions?.offsetX}
                offsetY={styleOptions?.offsetY}
                style={styleOptions?.dropdownStyle}
                toggleMeasurements={toggleMeasurements}
              />
            </View>
          </GestureDetector>
        )}
      </Portal>
    </>
  );
}

type DropdownContentProps = {
  options: Array<ActionSheetOption>;
  toggleMeasurements: LayoutMeasurements;
  alignment?: 'left' | 'right';
  offsetX?: number;
  offsetY?: number;
  dropdownMaxHeight?: number;
  style?: StyleProp<ViewStyle>;
  fitInScreen?: boolean;
  handleClose?: () => void;
};

function DropdownContent({
  alignment = 'left',
  dropdownMaxHeight,
  fitInScreen,
  handleClose,
  offsetX = 0,
  offsetY = spacing.xxs,
  options,
  style,
  toggleMeasurements,
}: DropdownContentProps): JSX.Element {
  const windowDimensions = Dimensions.get('window');
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const contentWidth = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const containerHeight = useSharedValue(0);

  const maxHeight =
    windowDimensions.height -
    toggleMeasurements.y -
    toggleMeasurements.height -
    spacing.xxl;

  const animatedDropdownStyle = useAnimatedStyle(() => {
    if (!contentWidth.value) {
      return { opacity: 0 };
    }

    if (alignment === 'left') {
      const maxWidth =
        windowDimensions.width - toggleMeasurements.x - spacing.sm;
      const calculatedPosition = toggleMeasurements.x + offsetX;

      return {
        left: fitInScreen
          ? Math.min(
              calculatedPosition,
              windowDimensions.width - contentWidth.value - spacing.md
            )
          : calculatedPosition,
        maxWidth,
        opacity: 1,
      };
    }

    const maxWidth =
      toggleMeasurements.x + toggleMeasurements.width - spacing.sm;
    const calculatedPosition =
      toggleMeasurements.x +
      toggleMeasurements.width +
      offsetX -
      contentWidth.value;

    return {
      left: fitInScreen
        ? Math.max(calculatedPosition, spacing.md)
        : calculatedPosition,
      maxWidth,
      opacity: 1,
    };
  });

  const dropdownStyle: ViewStyle = {
    maxHeight,
    position: 'absolute',
    top: toggleMeasurements.y + toggleMeasurements.height + offsetY,
  };

  const [paddingAndMargin, rest] = filterPaddingAndMarginProps(style);

  return (
    <Animated.View style={[dropdownStyle, animatedDropdownStyle]}>
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        pointerEvents="box-none">
        <View style={[{ maxHeight: dropdownMaxHeight }, rest]}>
          <Animated.ScrollView
            contentContainerStyle={paddingAndMargin}
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={(w, h) => {
              contentWidth.value = w;
              contentHeight.value = h;
            }}
            onLayout={({ nativeEvent: { layout } }) => {
              containerHeight.value = layout.height;
            }}>
            {options.map(({ key, onPress, render }: ActionSheetOption) => (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  onPress();
                  handleClose?.();
                }}>
                {render()}
              </TouchableOpacity>
            ))}
          </Animated.ScrollView>
          <ScrollBar
            containerHeight={containerHeight}
            contentHeight={contentHeight}
            scrollOffset={scrollOffset}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const SCROLLBAR_PADDING = 4;

type ScrollBarProps = {
  containerHeight: SharedValue<number>;
  contentHeight: SharedValue<number>;
  scrollOffset: SharedValue<number>;
};

function ScrollBar({
  containerHeight,
  contentHeight,
  scrollOffset,
}: ScrollBarProps) {
  const sizeRatio = useDerivedValue(() =>
    contentHeight.value > 0 ? containerHeight.value / contentHeight.value : 0
  );

  const animatedTrackStyle = useAnimatedStyle(() => ({
    opacity:
      contentHeight.value > 0 && contentHeight.value > 0 && sizeRatio.value < 1
        ? 1
        : 0,
  }));

  const animatedThumbStyle = useAnimatedStyle(() => {
    const maxHeight = containerHeight.value - 2 * SCROLLBAR_PADDING;
    const maxScrollOffset = contentHeight.value - containerHeight.value;
    const thumbHeight = maxHeight * sizeRatio.value;

    return {
      height: thumbHeight,
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [0, maxScrollOffset],
            [0, maxHeight - thumbHeight]
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.scrollBarTrack, animatedTrackStyle]}>
      <Animated.View style={[styles.scrollBarThumb, animatedThumbStyle]} />
    </Animated.View>
  );
}

type BackdropProps = {
  handleClose?: () => void;
};

function Backdrop({ handleClose }: BackdropProps): JSX.Element {
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  scrollBarThumb: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: radius.full,
    height: 100,
    position: 'absolute',
    width: '100%',
  },
  scrollBarTrack: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: radius.full,
    bottom: SCROLLBAR_PADDING,
    overflow: 'hidden',
    position: 'absolute',
    right: SCROLLBAR_PADDING,
    top: SCROLLBAR_PADDING,
    width: 5,
  },
});

import { useEffect, useRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';

import { colors, radius, spacing, text } from '@/theme';

export const MIN_SEARCH_SHOW_TRANSLATE_Y = 100;

type SearchBarProps = {
  onMeasure: (height: number) => void;
  onSearch: (query: string) => void;
  inputEnabled: boolean;
  translateY: SharedValue<number>;
};

export default function SearchBar({
  onMeasure,
  onSearch,
  inputEnabled,
  translateY,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);

  const containerHeight = useDerivedValue(() => Math.max(0, translateY.value));
  const showProgress = useDerivedValue(() =>
    inputEnabled
      ? 1
      : interpolate(
          containerHeight.value,
          [0, MIN_SEARCH_SHOW_TRANSLATE_Y],
          [0, 1],
          Extrapolation.CLAMP
        )
  );

  useEffect(() => {
    if (inputEnabled) {
      inputRef.current?.focus();
    } else {
      inputRef.current?.blur();
    }
  }, [inputEnabled]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: containerHeight.value,
  }));

  const animatedInnerContainerStyle = useAnimatedStyle(() => ({
    opacity: showProgress.value,
    transform: [{ scale: interpolate(showProgress.value, [0, 1], [0.9, 1]) }],
  }));

  return (
    <Animated.View style={[animatedContainerStyle, styles.container]}>
      <Animated.View
        style={[styles.inputContainer, animatedInnerContainerStyle]}
        onLayout={(e) => {
          onMeasure(e.nativeEvent.layout.height);
        }}>
        <TextInput
          placeholder="Search"
          placeholderTextColor={colors.foreground3}
          ref={inputRef}
          style={styles.input}
          onFocus={() => {
            inputRef.current?.focus();
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
  },
  input: {
    backgroundColor: colors.background2,
    borderColor: colors.background3,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.foreground1,
    padding: spacing.sm,
    ...text.subHeading2,
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});

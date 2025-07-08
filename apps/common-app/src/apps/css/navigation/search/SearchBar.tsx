import { StyleSheet, TextInput } from 'react-native';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';
import Animated, {
  dispatchCommand,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';

import { Button } from '@/apps/css/components';
import { colors, radius, sizes, spacing, text } from '@/theme';

type SearchBarProps = {
  value: string;
  showProgress: SharedValue<number>;
  translateY: SharedValue<number>;
  searchBarHeight: SharedValue<number>;
  onSearch: (query: string) => void;
};

export default function SearchBar({
  onSearch,
  value,
  showProgress,
  translateY,
  searchBarHeight,
}: SearchBarProps) {
  const inputRef = useAnimatedRef<TextInput>();
  const isFocused = useSharedValue(false);

  const containerHeight = useDerivedValue(() =>
    showProgress.value === 0 ? 0 : Math.max(0, translateY.value)
  );

  useAnimatedReaction(
    () => showProgress.value,
    (progress) => {
      if (progress === 1) {
        isFocused.value = true;
        dispatchCommand(inputRef, 'focus');
      } else if (progress === 0) {
        isFocused.value = false;
        dispatchCommand(inputRef, 'blur');
      }
    }
  );

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: containerHeight.value,
    pointerEvents: isFocused.value ? 'auto' : 'none',
  }));

  const animatedInnerContainerStyle = useAnimatedStyle(() => ({
    opacity: showProgress.value,
    transform: [
      isFocused.value
        ? {
            translateY: Math.min(translateY.value - searchBarHeight.value, 0),
          }
        : { scale: interpolate(showProgress.value, [0, 1], [0.9, 1]) },
    ],
  }));

  return (
    <Animated.View style={[animatedContainerStyle, styles.container]}>
      <Animated.View
        style={[styles.inputContainer, animatedInnerContainerStyle]}
        onLayout={(e) => {
          searchBarHeight.value = e.nativeEvent.layout.height;
        }}>
        <TextInput
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          placeholder="Search"
          placeholderTextColor={colors.foreground3}
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onSearch}
        />
        {value && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.buttonWrapper}>
            <Button
              size="small"
              title="Clear"
              onPress={() => {
                onSearch('');
                inputRef.current?.blur();
              }}
            />
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    marginTop: spacing.md,
    position: 'absolute',
    right: spacing.lg + spacing.xs,
    top: '50%',
    transform: [{ translateY: '-50%' }],
  },
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
    height: sizes.md,
    padding: spacing.sm,
    ...text.subHeading2,
  },
  inputContainer: {
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});

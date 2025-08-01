import { StyleSheet, TextInput } from 'react-native';
import { type SharedValue } from 'react-native-reanimated';
import Animated, {
  dispatchCommand,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { Button } from '@/apps/css/components';
import { colors, radius, sizes, spacing, text } from '@/theme';

type SearchBarProps = {
  value: string;
  showProgress: SharedValue<number>;
  onMeasureHeight: (height: number) => void;
  onSearch: (query: string) => void;
};

export default function SearchBar({
  onSearch,
  value,
  onMeasureHeight,
  showProgress,
}: SearchBarProps) {
  const inputRef = useAnimatedRef<TextInput>();

  useAnimatedReaction(
    () => showProgress.value,
    (progress) => {
      if (progress === 1) {
        dispatchCommand(inputRef, 'focus');
      } else if (progress === 0) {
        dispatchCommand(inputRef, 'blur');
      }
    }
  );

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: showProgress.value,
    transform: [{ scale: interpolate(showProgress.value, [0, 1], [0.9, 1]) }],
  }));

  return (
    <Animated.View
      style={[styles.inputContainer, animatedContainerStyle]}
      onLayout={(e) => {
        onMeasureHeight(e.nativeEvent.layout.height);
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
          <Button size="small" title="Clear" onPress={() => onSearch('')} />
        </Animated.View>
      )}
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
    backgroundColor: 'blue',
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});

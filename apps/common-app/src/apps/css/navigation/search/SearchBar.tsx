import { StyleSheet, TextInput } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
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
import { colors, radius, spacing, text } from '@/theme';

export const MIN_SEARCH_SHOW_TRANSLATE_Y = 100;

type SearchBarProps = {
  value: string;
  showProgress: SharedValue<number>;
  translateY: SharedValue<number>;
  onMeasure: (height: number) => void;
  onSearch: (query: string) => void;
};

export default function SearchBar({
  onMeasure,
  onSearch,
  value,
  showProgress,
  translateY,
}: SearchBarProps) {
  const inputRef = useAnimatedRef<TextInput>();

  const containerHeight = useDerivedValue(() => Math.max(0, translateY.value));

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
    padding: spacing.sm,
    ...text.subHeading2,
  },
  inputContainer: {
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});

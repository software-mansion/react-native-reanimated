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
import { colors, radius, sizes, spacing, style, text } from '@/theme';
import { IS_WEB } from '@/utils';

type SearchBarProps = {
  value: string;
  showProgress: SharedValue<number>;
  onChangeText: (query: string) => void;
  onCancel: () => void;
};

export default function SearchBar({
  onCancel,
  onChangeText,
  showProgress,
  value,
}: SearchBarProps) {
  const inputRef = useAnimatedRef<TextInput>();

  useAnimatedReaction(
    () => showProgress.value,
    (progress) => {
      if (IS_WEB) {
        return;
      }
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
    <Animated.View style={[styles.inputContainer, animatedContainerStyle]}>
      <TextInput
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        placeholder="Search"
        placeholderTextColor={colors.foreground3}
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
      {value ? (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.buttonWrapper}>
          <Button
            size="small"
            title="Cancel"
            onPress={() => {
              onCancel();
              inputRef.current?.blur();
            }}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    marginTop: IS_WEB ? spacing.xxs : spacing.md,
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
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    ...(IS_WEB && style.webContainer),
  },
});

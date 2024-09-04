import { ScrollView, StyleSheet } from 'react-native';
import type { ScrollViewProps } from 'react-native';
import { flex, spacing } from '../../theme';

type ScrollProps = ScrollViewProps & {
  fill?: boolean;
};

export default function Scroll({
  fill = true,
  style,
  contentContainerStyle,
  ...rest
}: ScrollProps) {
  return (
    <ScrollView
      style={[style, fill && flex.fill]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
});

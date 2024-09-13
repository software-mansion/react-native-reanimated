import { StyleSheet, View, Text } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import { spacing, text } from '../../../theme';

export type ExampleItemProps = Omit<CSSAnimationConfig, 'animationName'> & {
  label: string;
};

export type ExampleListCardProps = {
  config: CSSAnimationConfig;
  items: ExampleItemProps[];
  showCode?: boolean;
  renderExample: (config: CSSAnimationConfig) => JSX.Element;
};

export default function ExampleListCard({
  config,
  items,
  renderExample,
}: ExampleListCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.examples}>
        {/* Labels column */}
        <View style={[styles.column, { flexShrink: 1 }]}>
          {items.map((item, index) => (
            <Text style={styles.label} key={index}>
              {item.label}
            </Text>
          ))}
        </View>

        {/* Examples column */}
        <View style={[styles.column, { flexGrow: 1 }]}>
          {items.map((item, index) => (
            <View key={index}>{renderExample({ ...config, ...item })}</View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  examples: {
    gap: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    justifyContent: 'space-around',
    gap: spacing.xs,
    maxWidth: '55%',
  },
  label: {
    ...text.label2,
    flexShrink: 1,
  },
});

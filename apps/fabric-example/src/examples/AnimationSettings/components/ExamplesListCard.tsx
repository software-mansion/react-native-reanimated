import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import { spacing, text } from '../../../theme';
import { Text } from '../../../components';

export type ExampleItemProps = Omit<CSSAnimationConfig, 'animationName'> & {
  label: string;
};

export type ExamplesListCardProps = {
  config: CSSAnimationConfig;
  items: ExampleItemProps[];
  showCode?: boolean;
  renderExample: (config: CSSAnimationConfig) => JSX.Element;
};

export default function ExamplesListCard({
  config,
  items,
  renderExample,
}: ExamplesListCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.examples}>
        {/* Labels column */}
        <View style={[styles.column, { flexShrink: 1 }]}>
          {items.map((item, index) => (
            <Text variant="label2" style={styles.label} key={index}>
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
    flexShrink: 1,
  },
});

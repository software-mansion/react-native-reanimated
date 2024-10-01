import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import { spacing } from '../../../theme';
import { Button, Text } from '../../../components';
import { useState } from 'react';

export type ExampleItemProps = CSSAnimationSettings & {
  label: string;
};

export type ExamplesListCardProps = {
  config: CSSAnimationConfig;
  items: ExampleItemProps[];
  allowPause?: boolean;
  renderExample: (config: CSSAnimationConfig) => JSX.Element;
  onTogglePause?: (paused: boolean) => void;
};

export default function ExamplesListCard({
  config,
  items,
  renderExample,
  allowPause,
  onTogglePause,
}: ExamplesListCardProps) {
  const [isPaused, setIsPaused] = useState(false);

  const animationPlayState = isPaused ? 'paused' : 'running';

  return (
    <View style={styles.container}>
      {allowPause && (
        <View style={styles.buttonRow}>
          <Button
            style={styles.pauseButton}
            title={isPaused ? 'Play' : 'Pause'}
            onPress={() =>
              setIsPaused((prev) => {
                onTogglePause?.(!prev);
                return !prev;
              })
            }
          />
        </View>
      )}
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
            <View key={index}>
              {renderExample({
                ...config,
                ...item,
                ...(allowPause ? { animationPlayState } : {}),
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  pauseButton: {
    width: 72,
  },
});

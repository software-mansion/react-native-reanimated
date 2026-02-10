import { type JSX, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';

import { Button, Text } from '@/apps/css/components';
import { spacing } from '@/theme';

export type ExampleItemProps = {
  label: string;
} & CSSAnimationSettings;

type ExamplesListCardProps = {
  animation: CSSAnimationProperties;
  items: Array<ExampleItemProps>;
  allowPause?: boolean;
  renderExample: (animation: CSSAnimationProperties) => JSX.Element;
  onTogglePause?: (paused: boolean) => void;
};

export default function ExamplesListCard({
  allowPause,
  animation,
  items,
  onTogglePause,
  renderExample,
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
            <Text key={index} style={styles.label} variant="label2">
              {item.label}
            </Text>
          ))}
        </View>

        {/* Examples column */}
        <View style={[styles.column, { flexGrow: 1 }]}>
          {items.map((item, index) => (
            <View key={index}>
              {renderExample({
                ...animation,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  column: {
    gap: spacing.xs,
    justifyContent: 'space-around',
    maxWidth: '55%',
  },
  container: {
    gap: spacing.xs,
  },
  examples: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  label: {
    flexShrink: 1,
  },
  pauseButton: {
    width: 72,
  },
});

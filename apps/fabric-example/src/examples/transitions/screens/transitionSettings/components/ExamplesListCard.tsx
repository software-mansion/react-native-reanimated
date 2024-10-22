import { memo, useRef, useState } from 'react';
import { Button, Checkbox, Text } from '../../../../../components';
import { colors, spacing } from '../../../../../theme';
import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionConfig,
  CSSTransitionDuration,
  CSSTransitionSettings,
  StyleProps,
} from 'react-native-reanimated';
import TransitionStyleChange from './TransitionStyleChange';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useDebounce } from '../../../../../hooks';

const durationToNumber = (duration?: CSSTransitionDuration): number => {
  if (!duration) {
    return 0;
  }
  if (typeof duration === 'number') {
    return duration;
  }
  if (duration.endsWith('ms')) {
    return parseFloat(duration);
  }
  return parseFloat(duration) * 1000;
};

const getTimeout = (settings: CSSTransitionSettings): number => {
  return Math.max(durationToNumber(settings.transitionDuration ?? 0), 2000);
};

export type ExampleItemProps = CSSTransitionSettings & {
  label: string;
};

export type ExamplesListCardProps = {
  sharedConfig: CSSTransitionConfig;
  transitionStyles: StyleProps[];
  items: ExampleItemProps[];
  renderExample: (
    config: CSSTransitionConfig,
    style: StyleProps
  ) => JSX.Element;
};

export default function ExamplesListCard({
  sharedConfig,
  transitionStyles,
  items,
  renderExample,
}: ExamplesListCardProps) {
  const [displayStyleChanges, setDisplayStyleChanges] = useState(true);

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <Example
          key={index}
          sharedConfig={sharedConfig}
          transitionStyles={transitionStyles}
          item={item}
          renderExample={renderExample}
          displayStyleChanges={displayStyleChanges}
        />
      ))}
      <Animated.View style={styles.cardFooter} layout={LinearTransition}>
        <Checkbox
          selected={displayStyleChanges}
          onChange={setDisplayStyleChanges}
          label="Display style changes"
        />
      </Animated.View>
    </View>
  );
}

type ExampleProps = {
  sharedConfig: CSSTransitionConfig;
  transitionStyles: StyleProps[];
  item: ExampleItemProps;
  displayStyleChanges: boolean;
  renderExample: (
    config: CSSTransitionConfig,
    style: StyleProps
  ) => JSX.Element;
};

const Example = memo(function Example({
  sharedConfig,
  displayStyleChanges,
  transitionStyles,
  item,
  renderExample,
}: ExampleProps) {
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const [showStyleChange, setShowStyleChange] = useState(false);
  const styleChangeCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedStyleIndex = useDebounce(currentStyleIndex, 500);
  const currentTransitionStyle = transitionStyles[currentStyleIndex];

  const handlePress = () => {
    const nextIndex = (currentStyleIndex + 1) % transitionStyles.length;
    setCurrentStyleIndex(nextIndex);

    setTimeout(() => {
      if (displayStyleChanges) {
        setShowStyleChange(true);
        clearTimeout(styleChangeCloseTimeoutRef.current!);
        styleChangeCloseTimeoutRef.current = setTimeout(() => {
          setShowStyleChange(false);
        }, getTimeout(item));
      }
    }, 0);
  };

  return (
    <Animated.View layout={LinearTransition} style={{ overflow: 'hidden' }}>
      <View style={styles.exampleRow}>
        <View style={styles.labelWrapper}>
          <Text variant="label2" style={styles.label}>
            {item.label}
          </Text>
        </View>
        <View style={styles.example}>
          {renderExample(
            {
              ...sharedConfig,
              ...item,
            },
            currentTransitionStyle
          )}
        </View>
        <Button size="small" title="Run" onPress={handlePress} />
      </View>
      {displayStyleChanges && showStyleChange && (
        <TransitionStyleChange
          transitionStyles={transitionStyles}
          activeStyleIndex={debouncedStyleIndex}
        />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  cardFooter: {
    marginTop: spacing.xs,
    backgroundColor: colors.background1,
  },
  column: {
    justifyContent: 'space-around',
    gap: spacing.xs,
    maxWidth: '55%',
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  example: {
    flexGrow: 1,
  },
  labelWrapper: {
    flexBasis: '40%',
  },
  label: {
    flexShrink: 1,
  },
});

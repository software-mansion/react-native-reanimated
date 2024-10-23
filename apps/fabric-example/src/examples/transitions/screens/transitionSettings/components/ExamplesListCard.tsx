import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
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
import { useDebounce, useStableCallback } from '../../../../../hooks';

const MIN_STYLE_CHANGE_DURATION = 2500;

const timeToNumber = (duration?: CSSTransitionDuration): number => {
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

const getTimeout = (
  sharedConfig: CSSTransitionConfig,
  settings: CSSTransitionSettings
): number => {
  const duration = timeToNumber(
    settings.transitionDuration ?? sharedConfig.transitionDuration ?? 0
  );
  const delay = timeToNumber(
    settings.transitionDelay ?? sharedConfig.transitionDelay ?? 0
  );
  return Math.max(duration + delay, MIN_STYLE_CHANGE_DURATION);
};

export type ExampleItemProps = CSSTransitionSettings & {
  label: string;
};

export type ExamplesListCardProps = {
  sharedConfig: CSSTransitionConfig;
  transitionStyles: StyleProps[];
  items: ExampleItemProps[];
  displayStyleChanges: boolean;
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
  displayStyleChanges: inDisplayStyleChanges,
}: ExamplesListCardProps) {
  const [displayStyleChanges, setDisplayStyleChanges] = useState(
    inDisplayStyleChanges
  );
  const exampleRefsRef = useRef<Record<string, ExampleRef | null>>({});

  const handleReset = useCallback(() => {
    Object.values(exampleRefsRef.current).forEach((ref) => {
      ref?.reset();
    });
  }, []);

  const handleRunAll = useCallback(() => {
    Object.values(exampleRefsRef.current).forEach((ref) => {
      ref?.run();
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.cardHeader}>
        {items.length > 1 && (
          <Button size="small" title="Run all" onPress={handleRunAll} />
        )}
        <Button size="small" title="Reset all" onPress={handleReset} />
      </View>
      {items.map((item, index) => (
        <Example
          key={index}
          sharedConfig={sharedConfig}
          transitionStyles={transitionStyles}
          item={item}
          renderExample={renderExample}
          displayStyleChanges={displayStyleChanges}
          ref={(ref) => {
            exampleRefsRef.current[item.label] = ref;
          }}
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

type ExampleRef = {
  run: () => void;
  reset: () => void;
};

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

const Example = memo(
  forwardRef(function Example(
    {
      sharedConfig,
      displayStyleChanges,
      transitionStyles,
      item,
      renderExample,
    }: ExampleProps,
    ref: React.Ref<ExampleRef>
  ) {
    const [key, setKey] = useState(0);
    const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
    const [showStyleChange, setShowStyleChange] = useState(false);
    const styleChangeCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const debouncedStyleIndex = useDebounce(currentStyleIndex, 500);
    const currentTransitionStyle = transitionStyles[currentStyleIndex];

    const handlePress = useStableCallback(() => {
      const nextIndex = (currentStyleIndex + 1) % transitionStyles.length;
      setCurrentStyleIndex(nextIndex);

      setTimeout(() => {
        if (displayStyleChanges) {
          setShowStyleChange(true);
          clearTimeout(styleChangeCloseTimeoutRef.current!);
          styleChangeCloseTimeoutRef.current = setTimeout(
            () => {
              setShowStyleChange(false);
            },
            getTimeout(sharedConfig, item)
          );
        }
      }, 0);
    });

    useImperativeHandle(
      ref,
      () => ({
        run: handlePress,
        reset: () => {
          setCurrentStyleIndex(0);
          setShowStyleChange(false);
          setKey((prevKey) => prevKey + 1);
        },
      }),
      [handlePress]
    );

    return (
      <Animated.View layout={LinearTransition} style={{ overflow: 'hidden' }}>
        <View style={styles.exampleRow}>
          <View style={styles.labelWrapper}>
            <Text variant="label2" style={styles.label}>
              {item.label}
            </Text>
          </View>
          <View style={styles.example} key={key}>
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
  })
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
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

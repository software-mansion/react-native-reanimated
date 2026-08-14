import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { CSSAnimationProperties } from 'react-native-reanimated';
import Animated, { css } from 'react-native-reanimated';

import { Button, Screen, Section, Text } from '@/apps/css/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const pulse = css.keyframes({
  '0%, 100%': {
    transform: [{ scale: 1 }],
  },
  '50%': {
    transform: [{ scale: 1.5 }],
  },
});

const FINITE: CSSAnimationProperties = {
  animationDelay: '500ms',
  animationDuration: '1s',
  animationIterationCount: 3,
  animationName: pulse,
};

const INFINITE: CSSAnimationProperties = {
  animationDuration: '1s',
  animationIterationCount: 'infinite',
  animationName: pulse,
};

type LoggedEvent = {
  id: number;
  label: string;
};

export default function AnimationCallbacks() {
  const [events, setEvents] = useState<Array<LoggedEvent>>([]);
  const [animation, setAnimation] = useState<CSSAnimationProperties | null>(
    FINITE
  );
  const [isMounted, setIsMounted] = useState(true);

  const log = useCallback((type: string, elapsedTime: number) => {
    setEvents((current) => [
      ...current,
      { id: current.length, label: `${type} at ${elapsedTime.toFixed(2)}s` },
    ]);
  }, []);

  // A queued re-attach would otherwise land after a cancel and undo it.
  const restartFrame = useRef<number | null>(null);

  const cancelPendingRestart = useCallback(() => {
    if (restartFrame.current !== null) {
      cancelAnimationFrame(restartFrame.current);
      restartFrame.current = null;
    }
  }, []);

  useEffect(() => cancelPendingRestart, [cancelPendingRestart]);

  const restart = useCallback(
    (properties: CSSAnimationProperties) => {
      cancelPendingRestart();
      setEvents([]);
      setIsMounted(true);
      // Detaching first guarantees a fresh animation rather than a settings
      // update on the running one.
      setAnimation(null);
      restartFrame.current = requestAnimationFrame(() => {
        restartFrame.current = null;
        setAnimation(properties);
      });
    },
    [cancelPendingRestart]
  );

  const cancel = useCallback(() => {
    cancelPendingRestart();
    setAnimation(null);
  }, [cancelPendingRestart]);

  const unmount = useCallback(() => {
    cancelPendingRestart();
    setIsMounted(false);
  }, [cancelPendingRestart]);

  return (
    <Screen style={styles.screen}>
      <Section
        description="Animation lifecycle callbacks fired by the **native** CSS engine. `elapsedTime` is reported in **seconds**."
        title="Animation Callbacks">
        <View style={styles.content}>
          <View style={styles.buttons}>
            <Button
              style={flex.grow}
              title="Finite (3x)"
              onPress={() => restart(FINITE)}
            />
            <Button
              style={flex.grow}
              title="Infinite"
              onPress={() => restart(INFINITE)}
            />
            <Button style={flex.grow} title="Cancel" onPress={cancel} />
            <Button style={flex.grow} title="Unmount" onPress={unmount} />
            <Button
              style={flex.grow}
              title="Clear log"
              onPress={() => setEvents([])}
            />
          </View>

          <View style={styles.preview}>
            {isMounted && (
              <Animated.View
                style={[styles.box, animation]}
                onCSSAnimationEnd={({ elapsedTime }) => log('end', elapsedTime)}
                onCSSAnimationCancel={({ elapsedTime }) =>
                  log('cancel', elapsedTime)
                }
                onCSSAnimationIteration={({ elapsedTime }) =>
                  log('iteration', elapsedTime)
                }
                onCSSAnimationStart={({ elapsedTime }) =>
                  log('start', elapsedTime)
                }
              />
            )}
          </View>
        </View>
      </Section>

      <Section description="In order of arrival" title="Event Log" fill>
        <FlatList
          contentContainerStyle={styles.logContent}
          data={events}
          keyExtractor={(event) => String(event.id)}
          ListEmptyComponent={<Text variant="subHeading2">No events yet</Text>}
          renderItem={({ item }) => <Text variant="body1">{item.label}</Text>}
          style={styles.log}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    justifyContent: 'space-between',
  },
  content: {
    gap: spacing.xs,
  },
  log: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    flex: 1,
  },
  logContent: {
    gap: spacing.xxxs,
    padding: spacing.xs,
  },
  preview: {
    ...flex.center,
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
  },
  screen: {
    gap: spacing.sm,
    padding: spacing.sm,
  },
});

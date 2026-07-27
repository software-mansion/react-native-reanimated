import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CSSAnimationProperties } from 'react-native-reanimated';
import Animated, { css } from 'react-native-reanimated';

import {
  Button,
  ScrollScreen,
  Section,
  Stagger,
  Text,
} from '@/apps/css/components';
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

  const restart = useCallback(
    (properties: CSSAnimationProperties) => {
      setEvents([]);
      setIsMounted(true);
      // Detaching first guarantees a fresh animation rather than a settings
      // update on the running one.
      setAnimation(null);
      requestAnimationFrame(() => setAnimation(properties));
    },
    [setAnimation]
  );

  return (
    <ScrollScreen>
      <Stagger>
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
              <Button
                style={flex.grow}
                title="Cancel"
                onPress={() => setAnimation(null)}
              />
              <Button
                style={flex.grow}
                title="Unmount"
                onPress={() => setIsMounted(false)}
              />
            </View>

            <View style={styles.preview}>
              {isMounted && (
                <Animated.View
                  style={[
                    styles.box,
                    animation,
                    {
                      onAnimationCancel: ({ elapsedTime }) =>
                        log('cancel', elapsedTime),
                      onAnimationEnd: ({ elapsedTime }) =>
                        log('end', elapsedTime),
                      onAnimationIteration: ({ elapsedTime }) =>
                        log('iteration', elapsedTime),
                      onAnimationStart: ({ elapsedTime }) =>
                        log('start', elapsedTime),
                    },
                  ]}
                />
              )}
            </View>
          </View>
        </Section>

        <Section description="In order of arrival" title="Event Log">
          <View style={styles.log}>
            {events.length === 0 ? (
              <Text variant="subHeading2">No events yet</Text>
            ) : (
              events.map((event) => (
                <Text key={event.id} variant="body1">
                  {event.label}
                </Text>
              ))
            )}
          </View>
        </Section>
      </Stagger>
    </ScrollScreen>
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
    gap: spacing.xxxs,
    padding: spacing.xs,
  },
  preview: {
    ...flex.center,
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
  },
});

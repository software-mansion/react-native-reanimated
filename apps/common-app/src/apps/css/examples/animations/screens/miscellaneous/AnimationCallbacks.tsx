import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CSSAnimationProperties } from 'react-native-reanimated';
import Animated, { css } from 'react-native-reanimated';

import type { SelectableConfig } from '@/apps/css/components';
import {
  Button,
  ConfigSelector,
  ScrollScreen,
  Section,
  SelectListDropdown,
  Stagger,
  Text,
  useSelectableConfig,
} from '@/apps/css/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const ANIMATIONS = {
  fade: css.keyframes({
    from: { opacity: 1 },
    to: { opacity: 0.2 },
  }),
  pulse: css.keyframes({
    '0%, 100%': { transform: [{ scale: 1 }] },
    '50%': { transform: [{ scale: 1.5 }] },
  }),
  slide: css.keyframes({
    from: { transform: [{ translateX: -sizes.md }] },
    to: { transform: [{ translateX: sizes.md }] },
  }),
};

type AnimationKey = keyof typeof ANIMATIONS;

const ANIMATION_KEYS = Object.keys(ANIMATIONS) as Array<AnimationKey>;

// The engine reports the generated keyframes name, so map it back to the key
// the example declared it under to keep the log readable.
const ANIMATION_NAMES = new Map<string, AnimationKey>(
  ANIMATION_KEYS.map((key) => [ANIMATIONS[key].name, key])
);

// The keyframes come from the dropdown, so only the settings are selectable.
type AnimationSettings = Omit<CSSAnimationProperties, 'animationName'>;

const DEFAULT_ANIMATION_CONFIG: SelectableConfig<AnimationSettings> = {
  $animationDuration: {
    canDisable: true,
    options: ['0.5s', '1s', '2s'],
    value: '1s',
  },
  // eslint-disable-next-line perfectionist/sort-objects
  $animationDelay: {
    canDisable: true,
    disabled: true,
    options: ['0s', '250ms', '500ms'],
    value: '500ms',
  },
  // eslint-disable-next-line perfectionist/sort-objects
  $animationIterationCount: {
    canDisable: true,
    options: [1, 2, 3, 'infinite'],
    value: 3,
  },
  // eslint-disable-next-line perfectionist/sort-objects
  $animationDirection: {
    canDisable: true,
    disabled: true,
    options: ['normal', 'reverse', 'alternate'],
    value: 'alternate',
  },
};

// An infinite animation reports iterations forever, so the log keeps only the
// most recent ones.
const MAX_LOGGED_EVENTS = 50;

type LoggedEvent = {
  id: number;
  label: string;
};

export default function AnimationCallbacks() {
  const [selectableConfig, setSelectableConfig] = useState(
    DEFAULT_ANIMATION_CONFIG
  );
  const settings = useSelectableConfig(selectableConfig);

  const [animationKey, setAnimationKey] = useState<AnimationKey>('pulse');
  const [events, setEvents] = useState<Array<LoggedEvent>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  // Time of the restart, so the log can show the delay that `elapsedTime`
  // deliberately leaves out.
  const startedAt = useRef(Date.now());
  const restartFrame = useRef<null | number>(null);
  // Monotonic, so trimming the log never reuses a React key.
  const nextEventId = useRef(0);

  const cancelPendingRestart = useCallback(() => {
    if (restartFrame.current !== null) {
      cancelAnimationFrame(restartFrame.current);
      restartFrame.current = null;
    }
  }, []);

  useEffect(() => cancelPendingRestart, [cancelPendingRestart]);

  const log = useCallback((type: string, name: string, elapsedTime: number) => {
    const sinceStart = (Date.now() - startedAt.current) / 1000;
    setEvents((current) =>
      [
        ...current,
        {
          id: nextEventId.current++,
          label: `${type} (${ANIMATION_NAMES.get(name) ?? name}) at ${elapsedTime.toFixed(2)}s (+${sinceStart.toFixed(2)}s)`,
        },
      ].slice(-MAX_LOGGED_EVENTS)
    );
  }, []);

  // An animation restarts only when it is detached and attached again, so the
  // re-attach has to wait for the frame that removed it.
  const restart = useCallback(() => {
    cancelPendingRestart();
    setEvents([]);
    setIsMounted(true);
    // Stamped here rather than in the frame below so that a cancel caused by
    // this restart is timed against it too.
    startedAt.current = Date.now();
    setIsRunning(false);
    restartFrame.current = requestAnimationFrame(() => {
      restartFrame.current = null;
      setIsRunning(true);
    });
  }, [cancelPendingRestart]);

  // Removing the animation and unmounting the view are the two ways a running
  // animation gets interrupted, and both report `cancel` instead of `end`.
  const removeAnimation = useCallback(() => {
    cancelPendingRestart();
    setIsRunning(false);
  }, [cancelPendingRestart]);

  const unmountView = useCallback(() => {
    cancelPendingRestart();
    setIsMounted(false);
  }, [cancelPendingRestart]);

  const animation: CSSAnimationProperties | null = isRunning
    ? { ...settings, animationName: ANIMATIONS[animationKey] }
    : null;

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          title="Animation Callbacks"
          description={[
            'Animation lifecycle callbacks fired by the **native** CSS engine. `animationName` is the generated keyframes name, shown here as the key it was declared under.',
            '- pick the **keyframes** and press a **checkbox** to add or remove a setting',
            '- press **Restart** to play it, or interrupt a running animation with **Remove** or **Unmount view**, which report `cancel` instead of `end`',
          ]}>
          <View style={styles.content}>
            <View style={styles.pickerRow}>
              <Text variant="label2">Keyframes</Text>
              <SelectListDropdown
                alignment="right"
                selected={animationKey}
                options={ANIMATION_KEYS.map((key) => ({
                  label: key,
                  value: key,
                }))}
                onSelect={setAnimationKey}
              />
            </View>

            <ConfigSelector
              config={selectableConfig}
              onChange={setSelectableConfig}
            />

            <View style={styles.row}>
              <Button style={styles.action} title="Restart" onPress={restart} />
              <Button
                style={styles.action}
                title="Remove"
                onPress={removeAnimation}
              />
              <Button
                style={styles.action}
                title="Unmount view"
                onPress={unmountView}
              />
            </View>

            <View style={styles.preview}>
              {isMounted ? (
                <Animated.View
                  style={[styles.box, animation]}
                  onCSSAnimationCancel={({ animationName, elapsedTime }) =>
                    log('cancel', animationName, elapsedTime)
                  }
                  onCSSAnimationEnd={({ animationName, elapsedTime }) =>
                    log('end', animationName, elapsedTime)
                  }
                  onCSSAnimationIteration={({ animationName, elapsedTime }) =>
                    log('iteration', animationName, elapsedTime)
                  }
                  onCSSAnimationStart={({ animationName, elapsedTime }) =>
                    log('start', animationName, elapsedTime)
                  }
                />
              ) : (
                <Text style={styles.placeholder} variant="body2">
                  View unmounted. Press **Restart** to mount it again.
                </Text>
              )}
            </View>
          </View>
        </Section>

        <Section title="Event Log">
          <View style={styles.content}>
            <View style={styles.logHeader}>
              <View>
                <Text variant="label2">{events.length} events</Text>
                <Text style={styles.legend} variant="body2">
                  at `elapsedTime` (+ time since **Restart**)
                </Text>
              </View>
              <Button
                size="small"
                title="Clear"
                onPress={() => setEvents([])}
              />
            </View>
            <View style={styles.log}>
              {events.length === 0 ? (
                <Text variant="body1">No events yet</Text>
              ) : (
                events.map((event) => (
                  <Text key={event.id} variant="body1">
                    {event.label}
                  </Text>
                ))
              )}
            </View>
          </View>
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  action: {
    flexBasis: 0,
    flexGrow: 1,
  },
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  content: {
    gap: spacing.sm,
  },
  legend: {
    color: colors.foreground1,
  },
  log: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    gap: spacing.xxxs,
    minHeight: sizes.xxl,
    padding: spacing.xs,
  },
  logHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  placeholder: {
    color: colors.foreground3,
    textAlign: 'center',
  },
  preview: {
    ...flex.center,
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
});

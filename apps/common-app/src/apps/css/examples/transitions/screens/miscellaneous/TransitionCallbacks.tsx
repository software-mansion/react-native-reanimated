import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionProperties,
  StyleProps,
} from 'react-native-reanimated';
import Animated, { LinearTransition } from 'react-native-reanimated';

import type { SelectableConfig } from '@/apps/css/components';
import {
  Button,
  Checkbox,
  ConfigSelector,
  ScrollScreen,
  Section,
  Stagger,
  Text,
  useSelectableConfig,
} from '@/apps/css/components';
import { TransitionStyleChange } from '@/apps/css/examples/transitions/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const DEFAULT_TRANSITION_CONFIG: SelectableConfig<
  CSSTransitionProperties<ViewStyle>
> = {
  $transitionProperty: {
    canDisable: true,
    maxNumberOfValues: 2,
    options: ['width', 'opacity'],
    value: ['width', 'opacity'],
  },
  // eslint-disable-next-line perfectionist/sort-objects
  $transitionDuration: {
    canDisable: true,
    options: ['0s', '0.5s', '1s', '2s'],
    value: '1s',
  },
  // eslint-disable-next-line perfectionist/sort-objects
  $transitionDelay: {
    canDisable: true,
    disabled: true,
    options: ['0s', '250ms', '500ms', '1s'],
    value: '500ms',
  },
};

const TRANSITION_STYLES: Array<StyleProps> = [
  { opacity: 0.25, width: sizes.md },
  { opacity: 1, width: sizes.xl },
];

type LoggedEvent = {
  id: number;
  label: string;
};

export default function TransitionCallbacks() {
  const [selectableConfig, setSelectableConfig] = useState(
    DEFAULT_TRANSITION_CONFIG
  );
  const transition = useSelectableConfig(selectableConfig);

  const [events, setEvents] = useState<Array<LoggedEvent>>([]);
  const [styleIndex, setStyleIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(true);
  const [displayStyleChanges, setDisplayStyleChanges] = useState(false);

  // Time of the change that started the transition, so the log can show the
  // delay that `elapsedTime` deliberately leaves out.
  const triggeredAt = useRef(Date.now());
  const triggerFrame = useRef<null | number>(null);

  const cancelPendingTrigger = useCallback(() => {
    if (triggerFrame.current !== null) {
      cancelAnimationFrame(triggerFrame.current);
      triggerFrame.current = null;
    }
  }, []);

  useEffect(() => cancelPendingTrigger, [cancelPendingTrigger]);

  const log = useCallback(
    (type: string, propertyName: string, elapsedTime: number) => {
      const sinceTrigger = (Date.now() - triggeredAt.current) / 1000;
      setEvents((current) => [
        ...current,
        {
          id: current.length,
          label: `${type} (${propertyName}) at ${elapsedTime.toFixed(2)}s (+${sinceTrigger.toFixed(2)}s)`,
        },
      ]);
    },
    []
  );

  const trigger = useCallback(() => {
    cancelPendingTrigger();
    setEvents([]);
    setIsMounted(true);
    // A remounted view has to reach the screen with its current style before
    // the value flips, otherwise there is nothing to transition from.
    triggerFrame.current = requestAnimationFrame(() => {
      triggerFrame.current = null;
      triggeredAt.current = Date.now();
      setStyleIndex((index) => (index + 1) % TRANSITION_STYLES.length);
    });
  }, [cancelPendingTrigger]);

  // Interrupts a running transition, which reports `cancel` instead of `end`.
  const unmountView = useCallback(() => {
    cancelPendingTrigger();
    setIsMounted(false);
  }, [cancelPendingTrigger]);

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          title="Transition Callbacks"
          description={[
            'Transition lifecycle callbacks fired by the **native** CSS engine, reported **per property**.',
            '- press a **checkbox** to add or remove a transition setting',
            '- press **Trigger** to change the style, or **Unmount view** to interrupt a running transition, which reports `cancel` instead of `end`',
          ]}>
          <View style={styles.content}>
            <ConfigSelector
              config={selectableConfig}
              onChange={setSelectableConfig}
            />

            <View style={styles.row}>
              <Button style={styles.action} title="Trigger" onPress={trigger} />
              <Button
                style={styles.action}
                title="Unmount view"
                onPress={unmountView}
              />
            </View>

            <View style={styles.preview}>
              {isMounted && (
                <Animated.View
                  style={[
                    styles.box,
                    transition,
                    TRANSITION_STYLES[styleIndex],
                  ]}
                  onCSSTransitionCancel={({ elapsedTime, propertyName }) =>
                    log('cancel', propertyName, elapsedTime)
                  }
                  onCSSTransitionEnd={({ elapsedTime, propertyName }) =>
                    log('end', propertyName, elapsedTime)
                  }
                  onCSSTransitionRun={({ elapsedTime, propertyName }) =>
                    log('run', propertyName, elapsedTime)
                  }
                  onCSSTransitionStart={({ elapsedTime, propertyName }) =>
                    log('start', propertyName, elapsedTime)
                  }
                />
              )}
              {!isMounted && (
                <Text style={styles.placeholder} variant="body2">
                  View unmounted. Press **Trigger** to mount it again.
                </Text>
              )}
            </View>

            <Animated.View
              layout={LinearTransition}
              style={styles.styleChangeWrapper}>
              {displayStyleChanges && (
                <TransitionStyleChange
                  activeStyleIndex={styleIndex}
                  transitionStyles={TRANSITION_STYLES}
                />
              )}
            </Animated.View>
            <Checkbox
              label="Display style changes"
              selected={displayStyleChanges}
              onChange={setDisplayStyleChanges}
            />
          </View>
        </Section>

        <Section title="Event Log">
          <View style={styles.content}>
            <View style={styles.logHeader}>
              <View>
                <Text variant="label2">{events.length} events</Text>
                <Text style={styles.legend} variant="body2">
                  at `elapsedTime` (+ time since **Trigger**)
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
  styleChangeWrapper: {
    overflow: 'hidden',
  },
});

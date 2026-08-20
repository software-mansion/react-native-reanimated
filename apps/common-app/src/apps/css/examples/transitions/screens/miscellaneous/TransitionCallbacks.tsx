import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionProperties,
  StyleProps,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import {
  Button,
  ScrollScreen,
  Section,
  Stagger,
  Text,
} from '@/apps/css/components';
import { TransitionConfiguration } from '@/apps/css/examples/transitions/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const SIMPLE: CSSTransitionProperties<ViewStyle> = {
  transitionDuration: '1s',
  transitionProperty: 'width',
};

const DELAYED: CSSTransitionProperties<ViewStyle> = {
  transitionDelay: '500ms',
  transitionDuration: '1s',
  transitionProperty: 'width',
};

const MULTIPLE: CSSTransitionProperties<ViewStyle> = {
  transitionDuration: '1s',
  transitionProperty: ['width', 'opacity'],
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
  const [events, setEvents] = useState<Array<LoggedEvent>>([]);
  const [transition, setTransition] =
    useState<CSSTransitionProperties<ViewStyle> | null>(SIMPLE);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

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

  const changeStyle = useCallback(
    (properties: CSSTransitionProperties<ViewStyle>) => {
      cancelPendingTrigger();
      setEvents([]);
      setIsMounted(true);
      // The settings have to reach the view before the value changes, or the
      // transition starts with whatever was configured before.
      setTransition(properties);
      triggerFrame.current = requestAnimationFrame(() => {
        triggerFrame.current = null;
        triggeredAt.current = Date.now();
        setIsExpanded((expanded) => !expanded);
      });
    },
    [cancelPendingTrigger]
  );

  const removeTransition = useCallback(() => {
    cancelPendingTrigger();
    setTransition(null);
  }, [cancelPendingTrigger]);

  const unmountView = useCallback(() => {
    cancelPendingTrigger();
    setIsMounted(false);
  }, [cancelPendingTrigger]);

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          description="Transition lifecycle callbacks fired by the **native** CSS engine. They are reported **per property**. `elapsedTime` is in **seconds** and excludes the delay, while the value in brackets is the time since the change that started the transition."
          title="Transition Callbacks">
          <View style={styles.content}>
            <View style={styles.buttons}>
              <Button
                style={flex.grow}
                title="Change width"
                onPress={() => changeStyle(SIMPLE)}
              />
              <Button
                style={flex.grow}
                title="Change width (delayed)"
                onPress={() => changeStyle(DELAYED)}
              />
              <Button
                style={flex.grow}
                title="Change width + opacity"
                onPress={() => changeStyle(MULTIPLE)}
              />
              <Button
                style={flex.grow}
                title="Remove transition"
                onPress={removeTransition}
              />
              <Button
                style={flex.grow}
                title="Unmount view"
                onPress={unmountView}
              />
              <Button
                style={flex.grow}
                title="Clear log"
                onPress={() => setEvents([])}
              />
            </View>

            <View style={styles.preview}>
              {isMounted && (
                <Animated.View
                  style={[
                    styles.box,
                    transition,
                    {
                      opacity: isExpanded ? 1 : 0.25,
                      width: isExpanded ? sizes.xl : sizes.md,
                    },
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
            </View>
          </View>
        </Section>

        <Section description="In order of arrival" title="Event Log">
          <View style={styles.log}>
            {events.length === 0 ? (
              <Text variant="subHeading3">No events yet</Text>
            ) : (
              events.map((event) => (
                <Text key={event.id} variant="body1">
                  {event.label}
                </Text>
              ))
            )}
          </View>
        </Section>

        <Section
          description="Transition configuration consists of the style changes that will be animated and the transition settings."
          title="Transition configuration">
          <TransitionConfiguration
            transitionProperties={transition ?? {}}
            transitionStyles={TRANSITION_STYLES}
          />
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
    minHeight: sizes.xxl,
    padding: spacing.xs,
  },
  preview: {
    ...flex.center,
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
  },
});

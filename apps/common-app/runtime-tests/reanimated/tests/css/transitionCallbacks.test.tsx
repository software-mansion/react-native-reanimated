import React from 'react';
import { StyleSheet } from 'react-native';
import type { CSSTransitionEvent } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import {
  beforeEach,
  describe,
  expect,
  expectEventually,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';

const DURATION = 1000;

const recordedEvents: Array<string> = [];

function record(type: string) {
  return ({ propertyName }: CSSTransitionEvent) => {
    recordedEvents.push(`${type} ${propertyName}`);
  };
}

const CALLBACKS = {
  onCSSTransitionCancel: record('cancel'),
  onCSSTransitionEnd: record('end'),
  onCSSTransitionRun: record('run'),
  onCSSTransitionStart: record('start'),
};

function TransitionTest({
  opacity,
  listening,
  duration = DURATION,
  delay = 0,
}: {
  opacity: number;
  listening: boolean;
  duration?: number;
  delay?: number;
}) {
  return (
    <Animated.View
      style={[
        styles.box,
        {
          opacity,
          transitionDelay: delay,
          transitionDuration: duration,
          transitionProperty: 'opacity',
        },
      ]}
      {...(listening ? CALLBACKS : {})}
    />
  );
}

// A transition without callbacks may run on the platform animation path, which
// cannot report events, so attaching them mid-flight has to hand it over.
describe('CSS transition callbacks attached mid-flight', () => {
  beforeEach(() => {
    recordedEvents.length = 0;
  });

  test('report the end of a running transition', async () => {
    await render(<TransitionTest opacity={1} listening={false} />);
    await wait(100);
    await render(<TransitionTest opacity={0.2} listening={false} />);
    await wait(DURATION / 4);

    await render(<TransitionTest opacity={0.2} listening />);
    await expectEventually(() => recordedEvents.length, 3 * DURATION).toBe(1);
    await wait(100);

    expect(recordedEvents).toBe(['end opacity']);
  });

  test('report the start and end of a transition still in its delay', async () => {
    const delay = DURATION;
    const duration = DURATION / 2;
    await render(
      <TransitionTest
        opacity={1}
        listening={false}
        duration={duration}
        delay={delay}
      />
    );
    await wait(100);
    await render(
      <TransitionTest
        opacity={0.2}
        listening={false}
        duration={duration}
        delay={delay}
      />
    );
    await wait(delay / 4);

    await render(
      <TransitionTest
        opacity={0.2}
        listening
        duration={duration}
        delay={delay}
      />
    );
    await expectEventually(() => recordedEvents.length, 3 * DURATION).toBe(2);
    await wait(100);

    expect(recordedEvents).toBe(['start opacity', 'end opacity']);
  });

  test('report nothing for a transition that has already ended', async () => {
    const duration = DURATION / 5;
    await render(
      <TransitionTest opacity={1} listening={false} duration={duration} />
    );
    await wait(100);
    await render(
      <TransitionTest opacity={0.2} listening={false} duration={duration} />
    );
    await wait(3 * duration);

    await render(
      <TransitionTest opacity={0.2} listening duration={duration} />
    );
    await wait(DURATION);

    expect(recordedEvents.length).toBe(0);
  });
});

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'royalblue',
    height: 40,
    margin: 20,
    width: 40,
  },
});

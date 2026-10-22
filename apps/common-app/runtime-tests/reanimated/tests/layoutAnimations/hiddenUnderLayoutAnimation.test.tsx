import type { ComponentType, ReactNode } from 'react';
import React, { Activity } from 'react';
import { Freeze } from 'react-freeze';
import { LayoutAnimation, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  isViewMountedNatively,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const EXIT_MS = 600;
// Long enough that the view is shown again while LayoutAnimation still defers its removal.
const DELETE_ANIMATION = LayoutAnimation.create(
  EXIT_MS * 3,
  'easeInEaseOut',
  'opacity'
);

const styles = StyleSheet.create({
  box: { width: 100, height: 60, backgroundColor: '#2277dd' },
  hidden: { display: 'none' },
});

function Box() {
  const ref = useTestRef('box');
  return (
    <Animated.View
      ref={ref}
      exiting={FadeOut.duration(EXIT_MS)}
      style={styles.box}
    />
  );
}

interface Hiding {
  name: string;
  Container: ComponentType<{ hidden: boolean; children: ReactNode }>;
}

const HIDING: Hiding[] = [
  {
    name: 'display: none',
    Container: ({ hidden, children }) => (
      <View collapsable={false} style={hidden && styles.hidden}>
        {children}
      </View>
    ),
  },
  {
    name: 'react-freeze',
    Container: ({ hidden, children }) => (
      <Freeze freeze={hidden}>{children}</Freeze>
    ),
  },
  {
    name: 'Activity',
    Container: ({ hidden, children }) => (
      <Activity mode={hidden ? 'hidden' : 'visible'}>{children}</Activity>
    ),
  },
];

// React Native takes a hidden subtree out of the mounted tree on iOS, and on Android only with
// `useTraitHiddenOnAndroid`. With a delete config, LayoutAnimation defers that removal, and showing
// the subtree again before the animation ends flushes the Remove and Delete in the transaction that
// creates the same tags.
describe('Views hidden while React Native LayoutAnimation runs', () => {
  test.each(HIDING)(
    'shows a view hidden by ${name} again during LayoutAnimation and keeps its exiting animation',
    async ({ Container }) => {
      await render(
        <Container hidden={false}>
          <Box />
        </Container>
      );
      await waitForFrames();
      const tag = getTestComponent('box').getTag();

      LayoutAnimation.configureNext(DELETE_ANIMATION);
      await render(
        <Container hidden={true}>
          <Box />
        </Container>
      );
      await wait(EXIT_MS / 3);
      await render(
        <Container hidden={false}>
          <Box />
        </Container>
      );
      await wait(EXIT_MS);

      const component = getTestComponent('box');
      expect(component.getTag()).toBe(tag);
      await expectEventually(
        async () => (await component.getMountedViewProps())?.opacity
      ).toBe(1, ComparisonMode.FLOAT_DISTANCE);

      await render(<Container hidden={false}>{null}</Container>);
      await waitForFrames(3);
      expect(await isViewMountedNatively(tag)).toBe(true);
      await expectEventually(() => isViewMountedNatively(tag)).toBe(false);
    }
  );
});

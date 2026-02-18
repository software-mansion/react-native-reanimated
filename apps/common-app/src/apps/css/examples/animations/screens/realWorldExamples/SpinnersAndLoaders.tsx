/**
 * The original CSS implementation of this example can be found here:
 * https://codepen.io/Ferie/pen/wQMvXV?editors=1100
 */

import type { ComponentType } from 'react';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { css, cubicBezier } from 'react-native-reanimated';

import {
  Grid as GridLayout,
  ScrollScreen,
  Stagger,
  Text,
} from '@/apps/css/components';
import { colors, radius, spacing } from '@/theme';

const SPINNER_SIZE = 60;

export default function SpinnersAndLoaders() {
  return (
    <ScrollScreen contentContainerStyle={{ paddingVertical: spacing.lg }}>
      <GridLayout
        columnGap={spacing.sm}
        columns={3}
        rowGap={spacing.md}
        staggerInterval={100}>
        <Example Component={Spinner} title="Spinner" />
        <Example Component={Ring} title="Ring" />
        <Example Component={Roller} title="Roller" />
        <Example Component={Default} title="Default" />
        <Example Component={Ellipsis} title="Ellipsis" />
        <Example Component={Grid} title="Grid" />
        <Example Component={Ripple} title="Ripple" />
        <Example Component={DualRing} title="Dual Ring" />
        <Example Component={RectangleBounce} title="Rectangle Bounce" />
        <Example Component={Pulse} title="Pulse" />
        <Example Component={DoublePulse} title="Double Pulse" />
        <Example Component={Rectangle} title="Rectangle" />
        <Example Component={ThreeDots} title="Three Dots" />
        <Example Component={Cubes} title="Cubes" />
        <Example Component={Diamond} title="Diamond" />
      </GridLayout>
    </ScrollScreen>
  );
}

type ExampleProps = {
  title: string;
  Component: ComponentType;
};

function Example({ Component, title }: ExampleProps) {
  return (
    <View style={sharedStyles.cell}>
      <Stagger delay={50}>
        <Component />
        <Text variant="label2" center>
          {title}
        </Text>
      </Stagger>
    </View>
  );
}

const sharedStyles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    backgroundColor: colors.background1,
    borderRadius: radius.md,
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.sm,
    width: '100%',
  },
  loader: {
    height: SPINNER_SIZE,
    width: SPINNER_SIZE,
  },
});

function Spinner() {
  return (
    <View style={sharedStyles.loader}>
      {Array.from({ length: 12 }).map((_, index) => (
        <View
          key={index}
          style={[
            spinnerStyles.barWrapper,
            {
              transform: [
                { rotate: `${index * 30}deg` },
                { translateY: '-50%' },
                { translateX: '-50%' },
              ],
            },
          ]}>
          <Animated.View
            style={[
              spinnerStyles.bar,
              { animationDelay: `${-(11 - index) / 10}s` },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const spinnerBar = css.keyframes({
  to: {
    opacity: 0,
  },
});

const spinnerStyles = css.create({
  bar: {
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationName: spinnerBar,
    animationTimingFunction: 'linear',
    backgroundColor: colors.primary,
    borderRadius: SPINNER_SIZE,
    height: (1 / 6) * SPINNER_SIZE,
    top: 0.4 * SPINNER_SIZE,
    width: (1 / 12) * SPINNER_SIZE,
  },
  barWrapper: {
    left: '50%',
    position: 'absolute',
    top: '50%',
    transformOrigin: '0 0',
  },
});

function Ring() {
  return (
    <View style={sharedStyles.loader}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            ringStyles.part,
            { animationDelay: `${-0.15 * (index + 1)}s` },
          ]}
        />
      ))}
    </View>
  );
}

const ringPart = css.keyframes({
  to: {
    transform: [{ rotate: '360deg' }],
  },
});

const ringStyles = css.create({
  part: {
    ...StyleSheet.absoluteFillObject,
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationName: ringPart,
    animationTimingFunction: cubicBezier(0.5, 0, 0.5, 1),
    // borderBlock props are needed for Android
    borderBlockStartColor: colors.primary,
    borderColor: 'rgba(0, 0, 0, 0.01)',
    borderRadius: SPINNER_SIZE / 2,
    borderTopColor: colors.primary,
    borderWidth: 0.1 * SPINNER_SIZE,
  },
});

function Roller() {
  const DOT_COUNT = 8;

  return (
    <View style={sharedStyles.loader}>
      {Array.from({ length: DOT_COUNT }).map((_, index) => {
        const startOffset = (index - (DOT_COUNT - 1) / 2) * 15;

        return (
          <Animated.View
            key={index}
            style={[
              rollerStyles.dotWrapper,
              {
                animationDelay: `${-0.036 * (index + 1)}s`,
                animationName: css.keyframes({
                  to: {
                    transform: [{ rotate: `${360 + startOffset}deg` }],
                  },
                }),
                transform: [{ rotate: `${startOffset}deg` }],
              },
            ]}>
            <View style={[rollerStyles.dot]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const rollerStyles = css.create({
  dot: {
    backgroundColor: colors.primary,
    borderRadius: '50%',
    height: 0.1 * SPINNER_SIZE,
    top: 0.4 * SPINNER_SIZE,
    width: 0.1 * SPINNER_SIZE,
  },
  dotWrapper: {
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: cubicBezier(0.5, 0, 0.5, 1),
    left: '50%',
    position: 'absolute',
    top: '50%',
    transformOrigin: '0 0',
  },
});

function Default() {
  return (
    <View style={sharedStyles.loader}>
      {Array.from({ length: 12 }).map((_, index) => (
        <View
          key={index}
          style={[
            defaultStyles.dotWrapper,
            {
              transform: [
                { rotate: `${index * 30}deg` },
                { translateY: '-50%' },
                { translateX: '-50%' },
              ],
            },
          ]}>
          <Animated.View
            style={[
              defaultStyles.dot,
              { animationDelay: `${-(11 - index) / 10}s` },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const defaultDot = css.keyframes({
  '0%, 20%, 80%, 100%': {
    transform: [{ scale: 1 }],
  },
  '50%': {
    transform: [{ scale: 1.5 }],
  },
});

const defaultStyles = css.create({
  dot: {
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationName: defaultDot,
    animationTimingFunction: 'linear',
    backgroundColor: colors.primary,
    borderRadius: '50%',
    height: 0.1 * SPINNER_SIZE,
    top: 0.4 * SPINNER_SIZE,
    width: 0.1 * SPINNER_SIZE,
  },
  dotWrapper: {
    left: '50%',
    position: 'absolute',
    top: '50%',
    transformOrigin: '0 0',
  },
});

function Ellipsis() {
  return (
    <View style={sharedStyles.loader}>
      <Animated.View
        style={[
          ellipsisStyles.dot,
          {
            animationName: ellipsis1,
            left: 0.1 * SPINNER_SIZE,
          },
        ]}
      />
      <Animated.View
        style={[
          ellipsisStyles.dot,
          {
            animationName: ellipsis2,
            left: 0.1 * SPINNER_SIZE,
          },
        ]}
      />
      <Animated.View
        style={[
          ellipsisStyles.dot,
          {
            animationName: ellipsis2,
            left: 0.4 * SPINNER_SIZE,
          },
        ]}
      />
      <Animated.View
        style={[
          ellipsisStyles.dot,
          {
            animationName: ellipsis3,
            left: 0.7 * SPINNER_SIZE,
          },
        ]}
      />
    </View>
  );
}

const ellipsis1 = css.keyframes({
  from: {
    transform: [{ scale: 0 }],
  },
});

const ellipsis2 = css.keyframes({
  to: {
    transform: [{ translateX: 0.3 * SPINNER_SIZE }],
  },
});

const ellipsis3 = css.keyframes({
  to: {
    transform: [{ scale: 0 }],
  },
});

const ellipsisStyles = css.create({
  dot: {
    animationDuration: '0.6s',
    animationIterationCount: 'infinite',
    animationTimingFunction: cubicBezier(0.5, 0, 0.5, 1),
    backgroundColor: colors.primary,
    borderRadius: '50%',
    height: 0.2 * SPINNER_SIZE,
    position: 'absolute',
    top: 0.4 * SPINNER_SIZE,
    width: 0.2 * SPINNER_SIZE,
  },
});

function Grid() {
  return (
    <View style={gridStyles.grid}>
      {Array.from({ length: 9 }).map((_, index) => {
        const row = Math.floor(index / 3);
        const column = index % 3;
        const delay = -0.4 * (row + column);

        return (
          <Animated.View
            key={index}
            style={[gridStyles.dot, { animationDelay: `${delay}s` }]}
          />
        );
      })}
    </View>
  );
}

const gridDot = css.keyframes({
  '50%': {
    opacity: 0.5,
  },
});

const gridStyles = css.create({
  dot: {
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationName: gridDot,
    animationTimingFunction: 'linear',
    backgroundColor: colors.primary,
    borderRadius: '50%',
    height: 0.275 * SPINNER_SIZE,
    width: 0.275 * SPINNER_SIZE,
  },
  grid: {
    ...sharedStyles.loader,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0.0875 * SPINNER_SIZE,
  },
});

function Ripple() {
  return (
    <View style={sharedStyles.loader}>
      <Animated.View style={[rippleStyles.ripple]} />
      <Animated.View
        style={[rippleStyles.ripple, { animationDelay: '-0.5s' }]}
      />
    </View>
  );
}

const ripple = css.keyframes({
  from: {
    height: 0,
    opacity: 1,
    width: 0,
  },
  to: {
    height: SPINNER_SIZE,
    opacity: 0,
    width: SPINNER_SIZE,
  },
});

const rippleStyles = css.create({
  ripple: {
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationName: ripple,
    animationTimingFunction: cubicBezier(0, 0.2, 0.8, 1),
    borderColor: colors.primary,
    borderRadius: '50%',
    borderWidth: 0.05 * SPINNER_SIZE,
    left: '50%',
    position: 'absolute',
    top: '50%',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
  },
});

function DualRing() {
  return (
    <View style={sharedStyles.loader}>
      <Animated.View style={dualRingStyles.ring} />
    </View>
  );
}

const dualRing = css.keyframes({
  to: {
    transform: [{ rotate: '180deg' }],
  },
});

const dualRingStyles = css.create({
  ring: {
    ...StyleSheet.absoluteFillObject,
    animationDuration: '0.6s',
    animationIterationCount: 'infinite',
    animationName: dualRing,
    animationTimingFunction: 'linear',
    // borderBock props are needed for Android
    borderBlockEndColor: colors.primary,
    borderBlockStartColor: colors.primary,
    borderBottomColor: colors.primary,
    borderColor: 'rgba(0, 0, 0, 0.01)',
    borderRadius: SPINNER_SIZE / 2,
    borderTopColor: colors.primary,
    borderWidth: 0.1 * SPINNER_SIZE,
  },
});

function RectangleBounce() {
  return (
    <View style={RectangleBounceStyles.loader}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            RectangleBounceStyles.bar,
            { animationDelay: `${-1.5 + 0.1 * index}s` },
          ]}
        />
      ))}
    </View>
  );
}

const rectangleBounce = css.keyframes({
  '0%, 40%, 100%': {
    transform: [{ scaleY: 0.4 }],
  },
  '20%': {
    transform: [{ scaleY: 1 }],
  },
});

const RectangleBounceStyles = css.create({
  bar: {
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
    animationName: rectangleBounce,
    animationTimingFunction: 'ease-in-out',
    backgroundColor: colors.primary,
    height: '75%',
    width: '15%',
  },
  loader: {
    ...sharedStyles.loader,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
});

function Pulse() {
  return (
    <View style={sharedStyles.loader}>
      <Animated.View style={pulseStyles.pulse} />
    </View>
  );
}

const pulse = css.keyframes({
  from: {
    opacity: 0.8,
    transform: [{ scale: 0 }],
  },
  to: {
    opacity: 0,
  },
});

const pulseStyles = css.create({
  pulse: {
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
    animationName: pulse,
    animationTimingFunction: 'ease-out',
    backgroundColor: colors.primary,
    borderRadius: '50%',
    height: '100%',
    width: '100%',
  },
});

function DoublePulse() {
  return (
    <View style={sharedStyles.loader}>
      <Animated.View style={doublePulseStyles.pulse} />
      <Animated.View
        style={[
          doublePulseStyles.pulse,
          {
            animationDelay: '-350ms',
          },
        ]}
      />
    </View>
  );
}

const doublePulse = css.keyframes({
  from: {
    opacity: 0.8,
    transform: [{ scale: 0 }],
  },
  to: {
    opacity: 0,
  },
});

const doublePulseStyles = css.create({
  pulse: {
    ...StyleSheet.absoluteFillObject,
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
    animationName: doublePulse,
    animationTimingFunction: 'ease-out',
    backgroundColor: colors.primary,
    borderRadius: '50%',
  },
});

function Rectangle() {
  return (
    <View style={rectangleStyles.loader}>
      <Animated.View style={rectangleStyles.rectangle} />
    </View>
  );
}

const rectangle = css.keyframes({
  '0%': {
    transform: [{ perspective: 2 * SPINNER_SIZE }],
  },
  '50%': {
    transform: [{ perspective: 2 * SPINNER_SIZE }, { rotateX: '-180deg' }],
  },
  // eslint-disable-next-line perfectionist/sort-objects
  '100%': {
    transform: [
      { perspective: 2 * SPINNER_SIZE },
      { rotateX: '-180deg' },
      { rotateY: '-180deg' },
    ],
  },
});

const rectangleStyles = css.create({
  loader: {
    ...sharedStyles.loader,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rectangle: {
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationName: rectangle,
    animationTimingFunction: 'ease-in-out',
    backgroundColor: colors.primary,
    height: '75%',
    width: '75%',
  },
});

function ThreeDots() {
  return (
    <View style={threeDotsStyles.loader}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            threeDotsStyles.dot,
            { animationDelay: `${-0.16 * (2 - index)}s` },
          ]}
        />
      ))}
    </View>
  );
}

const threeDots = css.keyframes({
  '0%, 80%, 100%': {
    transform: [{ scale: 0 }],
  },
  '30%, 50%': {
    transform: [{ scale: 1 }],
  },
});

const threeDotsStyles = css.create({
  dot: {
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
    animationName: threeDots,
    animationTimingFunction: 'ease-in-out',
    backgroundColor: colors.primary,
    borderRadius: '50%',
    height: 0.25 * SPINNER_SIZE,
    width: 0.25 * SPINNER_SIZE,
  },
  loader: {
    ...sharedStyles.loader,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
});

function Cubes() {
  return (
    <View style={cubesStyles.loader}>
      {Array.from({ length: 9 }).map((_, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;

        const diagonal = col - row + 2;
        const delay = diagonal / 10;

        return (
          <Animated.View
            key={index}
            style={[cubesStyles.cube, { animationDelay: `${delay}s` }]}
          />
        );
      })}
    </View>
  );
}

const cube = css.keyframes({
  '0%, 70%, 100%': {
    transform: [{ scale: 1 }],
  },
  '35%': {
    transform: [{ scale: 0 }],
  },
});

const cubesStyles = css.create({
  cube: {
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
    animationName: cube,
    animationTimingFunction: 'ease-in-out',
    backgroundColor: colors.primary,
    height: (1 / 3) * SPINNER_SIZE,
    width: (1 / 3) * SPINNER_SIZE,
  },
  loader: {
    ...sharedStyles.loader,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

function Diamond() {
  const renderPart = (order: number) => (
    <View
      key={order}
      style={[
        diamondStyles.partWrapper,
        {
          transform: [{ rotateZ: `${order * 90}deg` }, { scale: 1.1 }],
        },
      ]}>
      <Animated.View
        style={[
          diamondStyles.part,
          { animationDelay: `${-0.3 * (4 - order)}s` },
        ]}
      />
    </View>
  );

  return (
    <View style={diamondStyles.loader}>
      <View style={diamondStyles.diamond}>
        {renderPart(0)}
        {renderPart(1)}
        {renderPart(3)}
        {renderPart(2)}
      </View>
    </View>
  );
}

const diamond = css.keyframes({
  '0%, 10%': {
    opacity: 0,
    transform: [{ perspective: 2 * SPINNER_SIZE }, { rotateX: '-180deg' }],
  },
  '25%, 75%': {
    opacity: 1,
    transform: [{ perspective: 2 * SPINNER_SIZE }, { rotateX: '0deg' }],
  },
  '90%, 100%': {
    opacity: 0,
    transform: [{ perspective: 2 * SPINNER_SIZE }, { rotateY: '180deg' }],
  },
});

const DIAMOND_SIZE = (SPINNER_SIZE * Math.sqrt(2)) / 2;

const diamondStyles = css.create({
  diamond: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: DIAMOND_SIZE,
    transform: [{ rotate: '45deg' }],
    width: DIAMOND_SIZE,
  },
  loader: {
    ...sharedStyles.loader,
    alignItems: 'center',
    justifyContent: 'center',
  },
  part: {
    ...StyleSheet.absoluteFillObject,
    animationDuration: '2.4s',
    animationIterationCount: 'infinite',
    animationName: diamond,
    animationTimingFunction: 'linear',
    backgroundColor: colors.primary,
    transformOrigin: '100% 100%',
  },
  partWrapper: {
    height: '50%',
    width: '50%',
  },
});

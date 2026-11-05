import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Easing, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Polyline } from 'react-native-svg';

import {
  Caption,
  CodeLine,
  DemoLayout,
  Segmented,
  Toggle,
} from './kit/controls';
import {
  Box,
  Flight,
  FlightAnimations,
  FlightLayer,
  allChannels,
  delayed,
  lerp,
  spring,
  timing,
  useFlight,
} from './kit/flight';
import { Phone, SCREEN_HEIGHT, SCREEN_WIDTH } from './kit/Phone';
import { PLACES, Scenery } from './kit/Scenery';
import {
  HEADER_BOTTOM,
  NavHeader,
  StackScreens,
  useScreenStack,
} from './kit/Stack';
import { useDemoTheme } from './kit/theme';

type Variant = 'default' | 'arc' | 'bouncyArc' | 'moveThenResize';

const ARC_DURATION = 600;
const arcPart = timing(ARC_DURATION);

const VARIANTS: Record<
  Variant,
  { animations: FlightAnimations; code: string }
> = {
  default: {
    animations: allChannels(timing()),
    code: 'SharedTransition',
  },
  arc: {
    animations: {
      x: timing(ARC_DURATION, Easing.linear),
      y: timing(ARC_DURATION, Easing.out(Easing.quad)),
      width: arcPart,
      height: arcPart,
      style: arcPart,
    },
    code: `SharedTransition.custom((values) => {
  'worklet';
  const config = { duration: 600 };
  return {
    originX: withTiming(values.targetOriginX, {
      ...config,
      easing: Easing.linear,
    }),
    originY: withTiming(values.targetOriginY, {
      ...config,
      easing: Easing.out(Easing.quad),
    }),
    width: withTiming(values.targetWidth, config),
    height: withTiming(values.targetHeight, config),
    borderRadius: withTiming(
      values.targetBorderRadius,
      config
    ),
  };
})`,
  },
  bouncyArc: {
    animations: {
      x: timing(ARC_DURATION, Easing.linear),
      y: spring(ARC_DURATION, 0.45),
      width: arcPart,
      height: arcPart,
      style: arcPart,
    },
    code: `SharedTransition.custom((values) => {
  'worklet';
  const config = { duration: 600 };
  return {
    originX: withTiming(values.targetOriginX, {
      ...config,
      easing: Easing.linear,
    }),
    originY: withSpring(values.targetOriginY, {
      ...config,
      dampingRatio: 0.45,
    }),
    width: withTiming(values.targetWidth, config),
    height: withTiming(values.targetHeight, config),
    borderRadius: withTiming(
      values.targetBorderRadius,
      config
    ),
  };
})`,
  },
  moveThenResize: {
    animations: {
      x: timing(300),
      y: timing(300),
      width: delayed(250, timing(300)),
      height: delayed(250, timing(300)),
      style: delayed(250, timing(300)),
    },
    code: `SharedTransition.custom((values) => {
  'worklet';
  const resize = (target: number) =>
    withDelay(250, withTiming(target));
  return {
    originX: withTiming(values.targetOriginX),
    originY: withTiming(values.targetOriginY),
    width: resize(values.targetWidth),
    height: resize(values.targetHeight),
    borderRadius: resize(values.targetBorderRadius),
  };
})`,
  },
};

const OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'arc', label: 'Arc' },
  { value: 'bouncyArc', label: 'Bouncy arc' },
  { value: 'moveThenResize', label: 'Move, then resize' },
] as const;

const PLACE = PLACES[3];
const TAG = 'valley';

const SOURCE: Box = {
  x: SCREEN_WIDTH - 18 - 58,
  y: SCREEN_HEIGHT - 40 - 58,
  width: 58,
  height: 58,
  borderRadius: 29,
  backgroundColor: PLACE.sky,
};

const TARGET: Box = {
  x: 14,
  y: HEADER_BOTTOM + 8,
  width: 132,
  height: 132,
  borderRadius: 24,
  backgroundColor: PLACE.sky,
};

export default function Custom({ width }: { width?: number }) {
  const theme = useDemoTheme();
  const [variant, setVariant] = useState<Variant>('arc');
  const [showPath, setShowPath] = useState(true);
  const stack = useScreenStack();
  const flight = useFlight();
  const busy = flight.pairs.length > 0;
  const path = useFlightPath(flight);

  const fly = (from: Box, to: Box) => {
    flight.start({
      pairs: [{ tag: TAG, from, to, content: <Scenery place={PLACE} /> }],
      animations: VARIANTS[variant].animations,
    });
  };

  const open = () => {
    fly(SOURCE, TARGET);
    stack.push();
  };

  const back = () => {
    fly(TARGET, SOURCE);
    stack.pop();
  };

  const hidden = { opacity: busy ? 0 : 1 };

  const home = (
    <View style={styles.fill}>
      <Text style={[styles.title, { color: theme.text }]}>Trips</Text>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[
            styles.placeholder,
            {
              top: HEADER_BOTTOM + 10 + index * 62,
              backgroundColor: theme.surface,
            },
          ]}
        />
      ))}
      <Pressable
        disabled={busy}
        onPress={open}
        style={[styles.box, frame(SOURCE), hidden]}>
        <Scenery place={PLACE} />
      </Pressable>
    </View>
  );

  const details = (
    <View style={styles.fill}>
      <NavHeader title={PLACE.name} onBack={busy ? () => {} : back} />
      <View style={[styles.box, frame(TARGET), hidden]}>
        <Scenery place={PLACE} />
      </View>
      <View style={styles.body}>
        {[1, 0.8, 0.9, 0.55].map((lineWidth, index) => (
          <View
            key={index}
            style={[
              styles.line,
              { width: `${lineWidth * 100}%`, backgroundColor: theme.line },
            ]}
          />
        ))}
      </View>
    </View>
  );

  const phone = (
    <Phone>
      <StackScreens stack={stack} first={home} second={details} />
      {showPath && path.length > 1 && (
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={styles.path}>
          <Polyline
            points={path.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={theme.target}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 6"
          />
        </Svg>
      )}
      <FlightLayer flight={flight} />
    </Phone>
  );

  return (
    <DemoLayout
      width={width}
      phone={phone}
      footer={<CodeLine>{VARIANTS[variant].code}</CodeLine>}>
      <Caption>
        Tap the round photo. Each option returns its own animations from
        SharedTransition.custom().
      </Caption>
      <Segmented value={variant} options={OPTIONS} onChange={setVariant} />
      <Toggle
        label="Show the path of the center"
        value={showPath}
        onChange={setShowPath}
      />
    </DemoLayout>
  );
}

interface Point {
  x: number;
  y: number;
}

function useFlightPath(flight: Flight) {
  const [points, setPoints] = useState<Point[]>([]);
  const pair = flight.pairs[0];
  const { x, y, width, height } = flight.channels;

  useEffect(() => {
    if (pair) {
      setPoints([]);
    }
  }, [pair]);

  const addPoint = (point: Point) =>
    setPoints((previous) => [...previous, point]);

  useAnimatedReaction(
    () => {
      if (!pair) {
        return null;
      }
      const { from, to } = pair;
      return {
        x:
          lerp(from.x, to.x, x.value) +
          lerp(from.width, to.width, width.value) / 2,
        y:
          lerp(from.y, to.y, y.value) +
          lerp(from.height, to.height, height.value) / 2,
      };
    },
    (point) => {
      if (point) {
        scheduleOnRN(addPoint, point);
      }
    },
    [pair]
  );

  return points;
}

function frame(box: Box) {
  return {
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    borderRadius: box.borderRadius,
    backgroundColor: box.backgroundColor,
  };
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  title: {
    position: 'absolute',
    top: HEADER_BOTTOM - 30,
    left: 16,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  placeholder: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 52,
    borderRadius: 14,
  },
  box: {
    position: 'absolute',
    overflow: 'hidden',
  },
  body: {
    position: 'absolute',
    top: TARGET.y + TARGET.height + 18,
    left: 16,
    right: 16,
    gap: 9,
  },
  line: {
    height: 7,
    borderRadius: 4,
  },
  path: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    zIndex: 55,
  },
});

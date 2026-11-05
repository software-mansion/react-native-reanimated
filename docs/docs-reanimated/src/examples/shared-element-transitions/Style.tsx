import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Caption, Control, DemoLayout, Segmented } from './kit/controls';
import {
  Box,
  ChannelAnimation,
  FlightLayer,
  allChannels,
  spring,
  timing,
  useFlight,
} from './kit/flight';
import { Phone, SCREEN_WIDTH, STATUS_BAR_HEIGHT } from './kit/Phone';
import { PLACES, Scenery } from './kit/Scenery';
import {
  HEADER_BOTTOM,
  NavHeader,
  StackScreens,
  useScreenStack,
} from './kit/Stack';
import { useDemoTheme } from './kit/theme';

type Preset = 'default' | 'slow' | 'spring' | 'bouncy';

const PRESETS: Record<Preset, { code: string; animation: ChannelAnimation }> = {
  default: { code: 'SharedTransition', animation: timing() },
  slow: { code: 'SharedTransition.duration(1200)', animation: timing(1200) },
  spring: { code: 'SharedTransition.springify()', animation: spring() },
  bouncy: {
    code: 'SharedTransition.springify(700).dampingRatio(0.35)',
    animation: spring(700, 0.35),
  },
};

const OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'slow', label: 'Slow' },
  { value: 'spring', label: 'Spring' },
  { value: 'bouncy', label: 'Bouncy' },
] as const;

const PLACE = PLACES[1];
const TAG = 'lagoon';

const SOURCE: Box = {
  x: 18,
  y: STATUS_BAR_HEIGHT + 66,
  width: 76,
  height: 76,
  borderRadius: 18,
  backgroundColor: PLACE.sky,
};

const TARGET_SIZE = 170;
const TARGET: Box = {
  x: (SCREEN_WIDTH - TARGET_SIZE) / 2,
  y: HEADER_BOTTOM + 24,
  width: TARGET_SIZE,
  height: TARGET_SIZE,
  borderRadius: TARGET_SIZE / 2,
  backgroundColor: PLACE.sky,
};

type Screen = 'A' | 'B';

export default function StyleDemo({ width }: { width?: number }) {
  const theme = useDemoTheme();
  const [styleA, setStyleA] = useState<Preset>('spring');
  const [styleB, setStyleB] = useState<Preset>('slow');
  const [usedStyleOf, setUsedStyleOf] = useState<Screen>('A');
  const stack = useScreenStack();
  const flight = useFlight();
  const busy = flight.pairs.length > 0;

  const fly = (from: Box, to: Box, preset: Preset) => {
    flight.start({
      pairs: [{ tag: TAG, from, to, content: <Scenery place={PLACE} /> }],
      animations: allChannels(PRESETS[preset].animation),
    });
  };

  const open = () => {
    setUsedStyleOf('A');
    fly(SOURCE, TARGET, styleA);
    stack.push();
  };

  const back = () => {
    setUsedStyleOf('B');
    fly(TARGET, SOURCE, styleB);
    stack.pop();
  };

  const hidden = { opacity: busy ? 0 : 1 };

  const screenA = (
    <View style={styles.fill}>
      <Text style={[styles.title, { color: theme.text }]}>Screen A</Text>
      <Pressable
        disabled={busy}
        onPress={open}
        style={[
          styles.box,
          frame(SOURCE),
          { backgroundColor: PLACE.sky },
          hidden,
        ]}>
        <Scenery place={PLACE} />
      </Pressable>
      <Text
        style={[styles.tapHint, { top: SOURCE.y + 26, color: theme.subtle }]}>
        ← Tap to open
      </Text>
      <StyleBadge preset={styleA} top={SOURCE.y + SOURCE.height + 16} />
    </View>
  );

  const screenB = (
    <View style={styles.fill}>
      <NavHeader title="Screen B" onBack={busy ? () => {} : back} />
      <View
        style={[
          styles.box,
          frame(TARGET),
          { backgroundColor: PLACE.sky },
          hidden,
        ]}>
        <Scenery place={PLACE} />
      </View>
      <StyleBadge preset={styleB} top={TARGET.y + TARGET.height + 16} />
    </View>
  );

  const phone = (
    <Phone>
      <StackScreens stack={stack} first={screenA} second={screenB} />
      <FlightLayer flight={flight} />
      {busy && (
        <View style={[styles.using, { backgroundColor: theme.accent }]}>
          <Text style={styles.usingText}>
            Using the style of Screen {usedStyleOf}
          </Text>
        </View>
      )}
    </Phone>
  );

  return (
    <DemoLayout width={width} phone={phone}>
      <Caption>
        Each screen sets its own sharedTransitionStyle. The transition uses the
        style of the screen that you leave.
      </Caption>
      <Control label="Screen A (used to go forward)">
        <Segmented value={styleA} options={OPTIONS} onChange={setStyleA} />
      </Control>
      <Control label="Screen B (used to go back)">
        <Segmented value={styleB} options={OPTIONS} onChange={setStyleB} />
      </Control>
    </DemoLayout>
  );
}

function StyleBadge({ preset, top }: { preset: Preset; top: number }) {
  const theme = useDemoTheme();
  return (
    <View style={[styles.badge, { top, borderColor: theme.line }]}>
      <Text style={[styles.badgeLabel, { color: theme.subtle }]}>
        sharedTransitionStyle
      </Text>
      <Text
        style={[
          styles.badgeCode,
          { color: theme.text, fontFamily: theme.mono },
        ]}>
        {PRESETS[preset].code}
      </Text>
    </View>
  );
}

function frame(box: Box) {
  return {
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    borderRadius: box.borderRadius,
  };
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  title: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 12,
    left: 18,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  box: {
    position: 'absolute',
    overflow: 'hidden',
  },
  tapHint: {
    position: 'absolute',
    left: SOURCE.x + SOURCE.width + 10,
    fontSize: 11,
  },
  badge: {
    position: 'absolute',
    left: 14,
    right: 14,
    padding: 8,
    borderWidth: 1,
    borderRadius: 10,
    gap: 3,
  },
  badgeLabel: {
    fontSize: 9,
  },
  badgeCode: {
    fontSize: 9,
  },
  using: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    zIndex: 70,
  },
  usingText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});

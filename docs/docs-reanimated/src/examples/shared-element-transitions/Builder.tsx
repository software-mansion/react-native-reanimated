import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Easing, EasingFunction } from 'react-native-reanimated';

import {
  CodeLine,
  Control,
  DemoLayout,
  Dropdown,
  SliderControl,
  TabBar,
} from './kit/controls';
import {
  Box,
  FlightLayer,
  allChannels,
  spring,
  timing,
  useFlight,
} from './kit/flight';
import { Phone, SCREEN_HEIGHT, SCREEN_WIDTH } from './kit/Phone';
import { ProgressChart } from './kit/ProgressChart';
import { PLACES, Scenery } from './kit/Scenery';
import {
  HEADER_BOTTOM,
  NavHeader,
  PUSH_DURATION,
  StackScreens,
  useScreenStack,
} from './kit/Stack';
import { useDemoTheme } from './kit/theme';

type Kind = 'timing' | 'spring';
type EasingName = 'default' | 'linear' | 'outExp' | 'inOutCubic' | 'outBack';

const EASINGS: Record<EasingName, { code: string; easing: EasingFunction }> = {
  default: {
    code: 'Easing.inOut(Easing.quad)',
    easing: Easing.inOut(Easing.quad),
  },
  linear: { code: 'Easing.linear', easing: Easing.linear },
  outExp: { code: 'Easing.out(Easing.exp)', easing: Easing.out(Easing.exp) },
  inOutCubic: {
    code: 'Easing.inOut(Easing.cubic)',
    easing: Easing.inOut(Easing.cubic),
  },
  outBack: {
    code: 'Easing.out(Easing.back(2))',
    easing: Easing.out(Easing.back(2)),
  },
};

const EASING_OPTIONS = [
  { value: 'default', label: 'inOut(quad)' },
  { value: 'linear', label: 'linear' },
  { value: 'outExp', label: 'out(exp)' },
  { value: 'inOutCubic', label: 'inOut(cubic)' },
  { value: 'outBack', label: 'out(back)' },
] as const;

const KIND_OPTIONS = [
  { value: 'timing', label: 'Timing' },
  { value: 'spring', label: 'Spring' },
] as const;

const PLACE = PLACES[2];
const TAG = 'cover';
const PLAYER_HEIGHT = 56;

const MINI: Box = {
  x: 18,
  y: SCREEN_HEIGHT - 26 - PLAYER_HEIGHT + 9,
  width: 38,
  height: 38,
  borderRadius: 8,
  backgroundColor: PLACE.sky,
};

const COVER_SIZE = SCREEN_WIDTH - 44;
const COVER: Box = {
  x: 22,
  y: HEADER_BOTTOM + 12,
  width: COVER_SIZE,
  height: COVER_SIZE,
  borderRadius: 20,
  backgroundColor: PLACE.sky,
};

export default function Builder({ width }: { width?: number }) {
  const theme = useDemoTheme();
  const [kind, setKind] = useState<Kind>('timing');
  const [duration, setDuration] = useState(500);
  const [easing, setEasing] = useState<EasingName>('default');
  const [springDuration, setSpringDuration] = useState(500);
  const [dampingRatio, setDampingRatio] = useState(0.5);
  const moveDuration = kind === 'timing' ? duration : springDuration;
  const stack = useScreenStack(moveDuration / PUSH_DURATION);
  const flight = useFlight();
  const busy = flight.pairs.length > 0;

  const animation =
    kind === 'timing'
      ? timing(duration, EASINGS[easing].easing)
      : spring(springDuration, dampingRatio);
  const code =
    kind === 'timing'
      ? `SharedTransition.duration(${duration})${
          easing === 'default' ? '' : `\n  .easing(${EASINGS[easing].code})`
        }`
      : `SharedTransition.springify(${springDuration})\n  .dampingRatio(${dampingRatio})`;

  const toggle = () => {
    if (busy) {
      return;
    }
    const opening = stack.top === 'first';
    flight.start({
      pairs: [
        {
          tag: TAG,
          from: opening ? MINI : COVER,
          to: opening ? COVER : MINI,
          content: <Scenery place={PLACE} />,
        },
      ],
      animations: allChannels(animation),
    });
    if (opening) {
      stack.push();
    } else {
      stack.pop();
    }
  };

  const hidden = { opacity: busy ? 0 : 1 };

  const library = (
    <View style={styles.fill}>
      <Text style={[styles.title, { color: theme.text }]}>Library</Text>
      {[0, 1, 2, 3, 4].map((index) => (
        <View
          key={index}
          style={[styles.song, { top: HEADER_BOTTOM + 14 + index * 50 }]}>
          <View
            style={[styles.songCover, { backgroundColor: theme.surface }]}
          />
          <View style={styles.songLines}>
            <View
              style={[
                styles.line,
                { width: '72%', backgroundColor: theme.line },
              ]}
            />
            <View
              style={[
                styles.line,
                { width: '40%', backgroundColor: theme.line },
              ]}
            />
          </View>
        </View>
      ))}
      <Pressable
        disabled={busy}
        onPress={toggle}
        style={[styles.player, { backgroundColor: theme.surface }]}>
        <View style={[styles.mini, hidden]}>
          <Scenery place={PLACE} />
        </View>
        <View style={styles.playerText}>
          <Text style={[styles.songTitle, { color: theme.text }]}>
            Coral Coast
          </Text>
          <Text style={[styles.songArtist, { color: theme.subtle }]}>
            Tap to open
          </Text>
        </View>
        <Text style={[styles.playIcon, { color: theme.text }]}>▶</Text>
      </Pressable>
    </View>
  );

  const player = (
    <View style={styles.fill}>
      <NavHeader title="Now playing" onBack={toggle} />
      <View style={[styles.cover, hidden]}>
        <Scenery place={PLACE} />
      </View>
      <Text style={[styles.bigTitle, { color: theme.text }]}>Coral Coast</Text>
      <Text style={[styles.bigArtist, { color: theme.subtle }]}>
        The Shared Elements
      </Text>
      <View style={[styles.track, { backgroundColor: theme.line }]}>
        <View style={[styles.trackFill, { backgroundColor: theme.accent }]} />
      </View>
    </View>
  );

  const phone = (
    <Phone>
      <StackScreens stack={stack} first={library} second={player} />
      <FlightLayer flight={flight} />
    </Phone>
  );

  return (
    <DemoLayout width={width} phone={phone}>
      <TabBar value={kind} options={KIND_OPTIONS} onChange={setKind} />
      {kind === 'timing' ? (
        <>
          <SliderControl
            label="duration"
            value={duration}
            min={100}
            max={2000}
            step={50}
            format={(value) => `${value} ms`}
            onChange={setDuration}
          />
          <Control label="easing">
            <Dropdown
              label="easing"
              value={easing}
              options={EASING_OPTIONS}
              onChange={setEasing}
            />
          </Control>
        </>
      ) : (
        <>
          <SliderControl
            label="springify(duration)"
            value={springDuration}
            min={100}
            max={2000}
            step={50}
            format={(value) => `${value} ms`}
            onChange={setSpringDuration}
          />
          <SliderControl
            label="dampingRatio"
            value={dampingRatio}
            min={0.1}
            max={1.5}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={setDampingRatio}
          />
        </>
      )}
      <CodeLine>{code}</CodeLine>
      <Control label="Progress of the transition">
        <ProgressChart
          progress={flight.channels.x}
          expectedDuration={kind === 'timing' ? duration : springDuration * 1.5}
        />
      </Control>
    </DemoLayout>
  );
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
  song: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  songCover: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  songLines: {
    flex: 1,
    gap: 6,
  },
  line: {
    height: 6,
    borderRadius: 3,
  },
  player: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: 26,
    height: PLAYER_HEIGHT,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: MINI.x - 9,
    paddingRight: 16,
    gap: 10,
  },
  mini: {
    backgroundColor: PLACE.sky,
    width: MINI.width,
    height: MINI.height,
    borderRadius: MINI.borderRadius,
    overflow: 'hidden',
  },
  playerText: {
    flex: 1,
  },
  songTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  songArtist: {
    fontSize: 10,
  },
  playIcon: {
    fontSize: 14,
  },
  cover: {
    position: 'absolute',
    backgroundColor: PLACE.sky,
    left: COVER.x,
    top: COVER.y,
    width: COVER.width,
    height: COVER.height,
    borderRadius: COVER.borderRadius,
    overflow: 'hidden',
  },
  bigTitle: {
    position: 'absolute',
    top: COVER.y + COVER.height + 18,
    left: COVER.x,
    fontSize: 18,
    fontWeight: '700',
  },
  bigArtist: {
    position: 'absolute',
    top: COVER.y + COVER.height + 42,
    left: COVER.x,
    fontSize: 11,
  },
  track: {
    position: 'absolute',
    top: COVER.y + COVER.height + 70,
    left: COVER.x,
    right: COVER.x,
    height: 4,
    borderRadius: 2,
  },
  trackFill: {
    width: '35%',
    height: 4,
    borderRadius: 2,
  },
});

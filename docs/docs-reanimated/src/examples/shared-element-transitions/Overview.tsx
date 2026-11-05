import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Caption, DemoLayout, Toggle } from './kit/controls';
import {
  Box,
  FlightLayer,
  FrameOutline,
  allChannels,
  timing,
  useFlight,
} from './kit/flight';
import { Phone, SCREEN_WIDTH, STATUS_BAR_HEIGHT } from './kit/Phone';
import { PLACES, Place, Scenery } from './kit/Scenery';
import { StackScreens, useScreenStack } from './kit/Stack';
import { useDemoTheme } from './kit/theme';

const SLOW_MOTION = 4;
const GRID_TOP = 92;
const GAP = 10;
const PADDING = 14;
const CARD_WIDTH = (SCREEN_WIDTH - 2 * PADDING - GAP) / 2;
const CARD_HEIGHT = 112;
const ROW_PITCH = CARD_HEIGHT + 46;
const HERO_HEIGHT = 236;

function cardBox(index: number, place: Place): Box {
  return {
    x: PADDING + (index % 2) * (CARD_WIDTH + GAP),
    y: GRID_TOP + Math.floor(index / 2) * ROW_PITCH,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    backgroundColor: place.sky,
  };
}

function heroBox(place: Place): Box {
  return {
    x: 0,
    y: 0,
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    borderRadius: 0,
    backgroundColor: place.sky,
  };
}

export default function Overview({ width }: { width?: number }) {
  const theme = useDemoTheme();
  const [slowMotion, setSlowMotion] = useState(false);
  const [showFrames, setShowFrames] = useState(true);
  const [selected, setSelected] = useState(0);
  const factor = slowMotion ? SLOW_MOTION : 1;
  const stack = useScreenStack(factor);
  const flight = useFlight();
  const place = PLACES[selected];
  const flyingPair = flight.pairs[0];
  const busy = flyingPair !== undefined;

  const fly = (from: Box, to: Box, flyingPlace: Place) => {
    const pair = {
      tag: flyingPlace.id,
      from,
      to,
      content: <Scenery place={flyingPlace} />,
    };
    flight.start({
      pairs: [pair],
      animations: allChannels(timing(500 * factor)),
    });
  };

  const open = (index: number) => {
    setSelected(index);
    fly(cardBox(index, PLACES[index]), heroBox(PLACES[index]), PLACES[index]);
    stack.push();
  };

  const back = () => {
    fly(heroBox(place), cardBox(selected, place), place);
    stack.pop();
  };

  const hidden = (tag: string) => ({ opacity: flight.isFlying(tag) ? 0 : 1 });

  const list = (
    <View style={styles.fill}>
      <Text style={[styles.title, { color: theme.text }]}>Discover</Text>
      <Text style={[styles.subtitle, { color: theme.subtle }]}>
        Tap a place to open it
      </Text>
      {PLACES.map((item, index) => {
        const box = cardBox(index, item);
        return (
          <Pressable
            key={item.id}
            disabled={busy}
            onPress={() => open(index)}
            style={[styles.card, { left: box.x, top: box.y }]}>
            <View
              style={[
                styles.cardImage,
                { backgroundColor: item.sky },
                hidden(item.id),
              ]}>
              <Scenery place={item} />
            </View>
            <Text style={[styles.cardName, { color: theme.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.cardCountry, { color: theme.subtle }]}>
              {item.country}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const details = (
    <View style={styles.fill}>
      <View
        style={[styles.hero, { backgroundColor: place.sky }, hidden(place.id)]}>
        <Scenery place={place} />
      </View>
      <Pressable
        disabled={busy}
        onPress={back}
        style={styles.backButton}
        hitSlop={8}>
        <Text style={styles.backIcon}>‹</Text>
      </Pressable>
      <View style={styles.detailsBody}>
        <Text style={[styles.detailsName, { color: theme.text }]}>
          {place.name}
        </Text>
        <Text style={[styles.detailsCountry, { color: theme.subtle }]}>
          {place.country} · ★ 4.9
        </Text>
        {[1, 0.92, 0.6].map((lineWidth) => (
          <View
            key={lineWidth}
            style={[
              styles.textLine,
              { width: `${lineWidth * 100}%`, backgroundColor: theme.line },
            ]}
          />
        ))}
        <View style={[styles.cta, { backgroundColor: theme.accent }]}>
          <Text style={styles.ctaText}>Plan a trip</Text>
        </View>
      </View>
    </View>
  );

  const phone = (
    <Phone statusBarTint={stack.top === 'second' ? 'light' : 'auto'}>
      <StackScreens stack={stack} first={list} second={details} />
      <FlightLayer flight={flight} />
      {showFrames && flyingPair && (
        <>
          <FrameOutline
            box={flyingPair.from}
            color={theme.source}
            label="old frame"
          />
          <FrameOutline
            box={flyingPair.to}
            color={theme.target}
            label="new frame"
            labelBelow
          />
        </>
      )}
    </Phone>
  );

  return (
    <DemoLayout width={width} phone={phone}>
      <Caption>
        One view moves from its frame on the old screen to its frame on the new
        screen.
      </Caption>
      <Toggle label="Slow motion" value={slowMotion} onChange={setSlowMotion} />
      <Toggle label="Show frames" value={showFrames} onChange={setShowFrames} />
    </DemoLayout>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  title: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 12,
    left: PADDING,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 42,
    left: PADDING,
    fontSize: 11,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardName: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: '600',
  },
  cardCountry: {
    marginTop: 1,
    fontSize: 10,
  },
  hero: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 6,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  backIcon: {
    marginTop: -3,
    fontSize: 22,
    fontWeight: '500',
    color: '#001a72',
  },
  detailsBody: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  detailsName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  detailsCountry: {
    marginTop: -4,
    marginBottom: 6,
    fontSize: 11,
  },
  textLine: {
    height: 7,
    borderRadius: 4,
  },
  cta: {
    marginTop: 'auto',
    marginBottom: 14,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});

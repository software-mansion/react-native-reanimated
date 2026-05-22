import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, ScrollScreen, Section } from '@/apps/css/components';
import { colors, radius, spacing } from '@/theme';

// Heavy grid to stress-test opacity transitions. Opacity is the only property
// currently routed to Core Animation on iOS (under the
// EXPERIMENTAL_PLATFORM_CSS_ANIMATIONS flag), so this exercises that path
// across many simultaneous tiles.
const COLUMNS = 12;
const ROWS = 18;
const TILE_COUNT = COLUMNS * ROWS;
const TILE_SIZE = 18;
const TILE_GAP = 2;

const BASE_DURATION_MS = 400;
const DURATION_JITTER_MS = 800;
const MAX_DELAY_MS = 900;

type Tile = {
  duration: number;
  delay: number;
  color: string;
};

function buildTiles(): Array<Tile> {
  const maxDistance = COLUMNS - 1 + (ROWS - 1);

  return Array.from({ length: TILE_COUNT }, (_, index) => {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    // Diagonal wave from top-left to bottom-right, normalized to [0, 1].
    const wave = (col + row) / maxDistance;

    // Per-tile pseudo-random jitter (deterministic so renders are stable).
    const noise = ((col * 73 + row * 131) % 100) / 100;

    return {
      // Hue shifts across the grid to make the cascade visible at a glance.
      color: `hsl(${Math.round((wave * 0.5 + noise * 0.5) * 360)}, 70%, 55%)`,
      delay: Math.round(wave * MAX_DELAY_MS),
      duration: BASE_DURATION_MS + Math.round(noise * DURATION_JITTER_MS),
    };
  });
}

export default function OpacityGridFade() {
  const [visible, setVisible] = useState(true);
  const tiles = useMemo(buildTiles, []);

  return (
    <ScrollScreen>
      <Section
        title="Opacity grid fade"
        description={`Grid of ${TILE_COUNT} squares, each running a CSS opacity transition with a per-tile duration (${BASE_DURATION_MS}-${
          BASE_DURATION_MS + DURATION_JITTER_MS
        }ms) and a delay cascading diagonally from the top-left (0-${MAX_DELAY_MS}ms). Tap the button to toggle visibility and watch the wave.`}>
        <View style={styles.controls}>
          <Button
            title={visible ? 'Fade out' : 'Fade in'}
            onPress={() => setVisible((prev) => !prev)}
          />
        </View>

        <View style={styles.grid}>
          {tiles.map((tile, index) => (
            <Animated.View
              key={index}
              style={[
                styles.tile,
                {
                  backgroundColor: tile.color,
                  opacity: visible ? 1 : 0,
                  transitionDelay: tile.delay,
                  transitionDuration: tile.duration,
                  transitionProperty: 'opacity',
                  transitionTimingFunction: 'ease-in-out',
                },
              ]}
            />
          ))}
        </View>
      </Section>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  controls: {
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  grid: {
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
    justifyContent: 'center',
    padding: spacing.sm,
  },
  tile: {
    borderRadius: radius.xs,
    height: TILE_SIZE,
    width: TILE_SIZE,
  },
});

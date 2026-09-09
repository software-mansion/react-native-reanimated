import React, { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type {
  EasingFunction,
  EntryOrExitLayoutType,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  FadeInLeft,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The layout rows travel the full track. The opacity rows replay FadeInLeft,
// which animates opacity and a 25 px translation. Each square should come to
// rest exactly inside the dashed outline at its target.
//
// A layout animation's last keyframe is the one that puts the view exactly on
// its target, and it is the keyframe most at risk of being dropped. What that
// costs is `1 - easing(1 - frame / duration)` of the distance - so it grows
// with how steep the easing is at the very end, and with how few frames the
// duration spans. Ease-out curves pay nothing, ease-in curves pay a lot.
const FRAME_MS = 1000 / 60;

const SQUARE_SIZE = 36;
const TRACK_PADDING = 4;
const OPACITY_TRAVEL = 25;
const IN_CUBIC = Easing.in(Easing.cubic);

type Row = {
  label: string;
  easing: EasingFunction;
  duration: number;
  color: string;
  entering?: EntryOrExitLayoutType;
  travel?: number;
};

const ROWS: Array<Row> = [
  {
    color: '#6BCB77',
    duration: 600,
    easing: Easing.out(Easing.exp),
    label: 'out(exp)',
  },
  {
    color: '#4D96FF',
    duration: 600,
    easing: Easing.linear,
    label: 'linear',
  },
  {
    color: '#FFD93D',
    duration: 300,
    easing: IN_CUBIC,
    label: 'in(cubic)',
  },
  {
    color: '#FF9F45',
    duration: 300,
    easing: Easing.exp,
    label: 'exp',
  },
  {
    color: '#FF6B6B',
    duration: 150,
    easing: Easing.exp,
    label: 'exp (half the duration)',
  },
  {
    color: '#9C6ADE',
    duration: 150,
    easing: IN_CUBIC,
    entering: FadeInLeft.duration(150).easing(IN_CUBIC),
    label: 'opacity + in(cubic)',
    travel: OPACITY_TRAVEL,
  },
  {
    color: '#D84A9B',
    duration: 150,
    easing: Easing.exp,
    entering: FadeInLeft.duration(150).easing(Easing.exp),
    label: 'opacity + exp',
    travel: OPACITY_TRAVEL,
  },
];

// Share of the distance still left to travel one frame before the end.
function missingFraction({ duration, easing }: Row) {
  return 1 - easing(1 - FRAME_MS / duration);
}

export default function FinalFrameAccuracyExample() {
  const [toggled, setToggled] = useState(false);
  const [travel, setTravel] = useState(0);
  const insets = useSafeAreaInsets();

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTravel(event.nativeEvent.layout.width - 2 * TRACK_PADDING - SQUARE_SIZE);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
      <Text style={styles.title}>Where does the last keyframe land?</Text>
      <Text style={styles.hint}>
        Each square must end up inside the dashed outline. A dropped final
        keyframe leaves it `1 - easing(1 - frame/duration)` of the way short -
        negligible for ease-out, huge for ease-in, and worse the shorter the
        duration. The opacity rows use entering animations that the old
        opacity-based check allowed. Figures assume 60 fps; on a 120 Hz display
        they halve.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => setToggled((value) => !value)}>
        <Text style={styles.buttonText}>Toggle</Text>
      </Pressable>

      {ROWS.map((row) => {
        const missing = missingFraction(row);
        const animatedTravel = row.travel ?? travel;

        return (
          <View key={row.label} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowLabel}>
                {row.label} · {row.duration} ms
              </Text>
              <Text style={styles.rowValue}>
                {(missing * 100).toFixed(missing < 0.01 ? 2 : 1)}%
                {animatedTravel > 0
                  ? ` · ${(missing * animatedTravel).toFixed(1)} px`
                  : ''}
              </Text>
            </View>

            <View
              style={[
                styles.track,
                { justifyContent: toggled ? 'flex-end' : 'flex-start' },
              ]}
              onLayout={onTrackLayout}>
              <View
                pointerEvents="none"
                style={[styles.ghost, styles.ghostLeft]}
              />
              <View
                pointerEvents="none"
                style={[styles.ghost, styles.ghostRight]}
              />
              <Animated.View
                key={row.entering ? String(toggled) : row.label}
                entering={row.entering}
                style={[styles.square, { backgroundColor: row.color }]}
                layout={
                  row.entering
                    ? undefined
                    : LinearTransition.easing(row.easing).duration(row.duration)
                }
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#001a72',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  ghost: {
    borderColor: '#b0b4c0',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: SQUARE_SIZE,
    position: 'absolute',
    top: TRACK_PADDING,
    width: SQUARE_SIZE,
  },
  ghostLeft: {
    left: TRACK_PADDING,
  },
  ghostRight: {
    right: TRACK_PADDING,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  root: {
    backgroundColor: '#fff',
    flex: 1,
    padding: 16,
  },
  row: {
    marginBottom: 16,
  },
  rowHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowValue: {
    color: '#888',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  square: {
    borderRadius: 8,
    height: SQUARE_SIZE,
    width: SQUARE_SIZE,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  track: {
    backgroundColor: '#f1f2f6',
    borderRadius: 10,
    flexDirection: 'row',
    padding: TRACK_PADDING,
  },
});

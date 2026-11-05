import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SharedValue, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Line, Polyline } from 'react-native-svg';

import { useDemoTheme } from './theme';

const HEIGHT = 120;
const MIN_PROGRESS = -0.25;
const MAX_PROGRESS = 1.35;
const RANGE_MARGIN = 0.1;
const FRAME_MS = 1000 / 60;

interface Sample {
  time: number;
  progress: number;
}

interface ProgressChartProps {
  progress: SharedValue<number>;
  expectedDuration: number;
  width?: number;
}

export function ProgressChart({
  progress,
  expectedDuration,
  width = 280,
}: ProgressChartProps) {
  const theme = useDemoTheme();
  const samples = useProgressTrace(progress);
  const lastTime = samples.length ? samples[samples.length - 1].time : 0;
  const domain = Math.max(expectedDuration, lastTime, 1);
  const toX = (time: number) => (time / domain) * (width - 2) + 1;
  const values = samples.map((sample) => sample.progress);
  const low = Math.min(MIN_PROGRESS, ...values.map((v) => v - RANGE_MARGIN));
  const high = Math.max(MAX_PROGRESS, ...values.map((v) => v + RANGE_MARGIN));
  const toY = (value: number) =>
    HEIGHT - ((value - low) / (high - low)) * HEIGHT;
  const points = samples
    .map(
      (sample) =>
        `${toX(sample.time).toFixed(1)},${toY(sample.progress).toFixed(1)}`
    )
    .join(' ');

  return (
    <View style={styles.container}>
      <Svg width={width} height={HEIGHT}>
        {[0, 1].map((value) => (
          <Line
            key={value}
            x1={0}
            x2={width}
            y1={toY(value)}
            y2={toY(value)}
            stroke={theme.subtle}
            strokeOpacity={0.4}
            strokeDasharray="4 4"
          />
        ))}
        {samples.length > 1 && (
          <Polyline
            points={points}
            fill="none"
            stroke={theme.accent}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        )}
      </Svg>
      <Text style={[styles.label, { top: toY(1) - 16, color: theme.subtle }]}>
        target
      </Text>
      <Text style={[styles.label, { top: toY(0) + 2, color: theme.subtle }]}>
        source
      </Text>
      <Text style={[styles.time, { color: theme.subtle }]}>
        {samples.length > 1
          ? `${Math.round(lastTime)} ms`
          : 'Run the transition to draw its curve'}
      </Text>
    </View>
  );
}

function useProgressTrace(progress: SharedValue<number>) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const start = useRef(0);

  const record = (value: number) => {
    const now = performance.now();
    if (value === 0) {
      start.current = now;
      setSamples([{ time: 0, progress: 0 }]);
      return;
    }
    // The first move starts from 0 without a change, so it gets no 0 sample.
    if (start.current === 0) {
      start.current = now - FRAME_MS;
      setSamples([
        { time: 0, progress: 0 },
        { time: FRAME_MS, progress: value },
      ]);
      return;
    }
    const time = now - start.current;
    setSamples((previous) => [...previous, { time, progress: value }]);
  };

  useAnimatedReaction(
    () => progress.value,
    (value, previous) => {
      if (previous !== null && value !== previous) {
        scheduleOnRN(record, value);
      }
    }
  );

  return samples;
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    position: 'absolute',
    right: 2,
    fontSize: 10,
  },
  time: {
    fontSize: 11,
    textAlign: 'right',
  },
});

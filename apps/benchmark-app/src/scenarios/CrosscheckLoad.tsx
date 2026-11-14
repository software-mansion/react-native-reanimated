import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useFrameCallback } from 'react-native-reanimated';

import { Grid } from '../components/Grid';
import { range } from '../components/range';
import NativeBenchmarkReporter from '../specs/NativeBenchmarkReporter';
import type { ScenarioProps } from './registry';

const EPOCH_POLL_MS = 50;

const BUSY_MS_PER_FRAME = 6;

export function findCrosscheckLoadUnmetRequirement() {
  return Platform.OS === 'ios'
    ? undefined
    : 'the cross-check with Instruments runs only on iOS';
}

export function CrosscheckLoad({ load }: ScenarioProps) {
  const epochLoad = useEpochLoad();
  useUiStall(epochLoad === 'ui-stall');
  useJsLoad(epochLoad === 'js-load');
  const step = useRenderLoop(epochLoad === 'render-heavy');

  return (
    <Grid>
      {range(0, load).map((index) => (
        <View
          key={index}
          style={[styles.box, { width: 6 + ((step + index) % 12) }]}
        />
      ))}
    </Grid>
  );
}

function useEpochLoad() {
  const [epochLoad, setEpochLoad] = useState('none');

  useEffect(() => {
    const interval = setInterval(
      () => setEpochLoad(NativeBenchmarkReporter.currentEpochLoad()),
      EPOCH_POLL_MS
    );
    return () => clearInterval(interval);
  }, []);

  return epochLoad;
}

function useUiStall(active: boolean) {
  const stall = useFrameCallback(() => {
    'worklet';
    busyWait(BUSY_MS_PER_FRAME);
  }, false);

  useEffect(() => {
    stall.setActive(active);
  }, [active, stall]);
}

function useJsLoad(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }
    let request = requestAnimationFrame(function frame() {
      busyWait(BUSY_MS_PER_FRAME);
      request = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(request);
  }, [active]);
}

function useRenderLoop(active: boolean) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }
    let request = requestAnimationFrame(function frame() {
      setStep((value) => value + 1);
      request = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(request);
  }, [active]);

  return step;
}

function busyWait(ms: number) {
  'worklet';
  const end = Date.now() + ms;
  let now = Date.now();
  while (now < end) {
    now = Date.now();
  }
}

const styles = StyleSheet.create({
  box: {
    height: 14,
    margin: 3,
    backgroundColor: 'gray',
  },
});

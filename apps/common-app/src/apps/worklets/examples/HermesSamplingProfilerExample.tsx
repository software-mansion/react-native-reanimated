import { Button, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { scheduleOnUI } from 'react-native-worklets';

declare global {
  var _startProfiling: (meanHzFreq?: number) => void;
  var _stopProfiling: () => string;
}

const RN_RUNTIME_MEAN_HZ_FREQ = 100;
const UI_RUNTIME_MEAN_HZ_FREQ = 1200;

export default function HermesSamplingProfilerExample() {
  const [isProfilingRN, setIsProfilingRN] = useState(false);
  const [isProfilingUI, setIsProfilingUI] = useState(false);

  const handleStartRNProfiling = () => {
    if (isProfilingRN) return;
    setIsProfilingRN(true);
    globalThis._startProfiling(RN_RUNTIME_MEAN_HZ_FREQ);
  };

  const handleStopRNProfiling = () => {
    if (!isProfilingRN) return;
    setIsProfilingRN(false);
    const path = globalThis._stopProfiling();
    console.log(path);
  };

  const handleStartUIProfiling = () => {
    if (isProfilingUI) return;
    setIsProfilingUI(true);
    scheduleOnUI(() => {
      globalThis._startProfiling(UI_RUNTIME_MEAN_HZ_FREQ);
    });
  };

  const handleStopUIProfiling = () => {
    if (!isProfilingUI) return;
    setIsProfilingUI(false);
    scheduleOnUI(() => {
      const path = globalThis._stopProfiling();
      console.log(path);
    });
  };

  useEffect(() => {
    const id = setInterval(function sleepOnJSThread() {
      const start = performance.now();
      while (performance.now() - start < 100) {
        // do nothing
      }
    }, 300);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      scheduleOnUI(function sleepOnUIThread() {
        const start = performance.now();
        while (performance.now() - start < 100) {
          // do nothing
        }
      });
    }, 300);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.container}>
      <Button
        title="Start RN runtime profiling"
        onPress={handleStartRNProfiling}
        disabled={isProfilingRN}
      />
      <Button
        title="Stop RN runtime profiling"
        onPress={handleStopRNProfiling}
        disabled={!isProfilingRN}
      />
      <Button
        title="Start UI runtime profiling"
        onPress={handleStartUIProfiling}
        disabled={isProfilingUI}
      />
      <Button
        title="Stop UI runtime profiling"
        onPress={handleStopUIProfiling}
        disabled={!isProfilingUI}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});

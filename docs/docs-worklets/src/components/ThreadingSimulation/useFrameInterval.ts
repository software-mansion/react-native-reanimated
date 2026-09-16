import { useEffect, useState } from 'react';

const DEFAULT_FRAME_MS = 1000 / 60;
const SAMPLE_FRAMES = 12;

export function useFrameInterval(): number {
  const [frameMs, setFrameMs] = useState(DEFAULT_FRAME_MS);

  useEffect(() => {
    if (typeof requestAnimationFrame === 'undefined') {
      return;
    }
    const deltas: number[] = [];
    let previous: number | null = null;
    let handle = requestAnimationFrame(function sample(now) {
      if (previous !== null) {
        deltas.push(now - previous);
      }
      previous = now;
      if (deltas.length < SAMPLE_FRAMES) {
        handle = requestAnimationFrame(sample);
        return;
      }
      const sorted = [...deltas].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      if (median > 0 && Number.isFinite(median)) {
        setFrameMs(median);
      }
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  return frameMs;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { simulate } from '@site/src/simulation';
import type {
  ScreenState,
  Snapshot,
  SnippetModule,
} from '@site/src/simulation';
import { displaySource } from '@site/src/simulation/display';

export const PROPAGATION_MS = 100;

function withFinalStep(snapshots: Snapshot[]): Snapshot[] {
  const last = snapshots[snapshots.length - 1];
  if (last === undefined || !last.finished) {
    return snapshots;
  }
  return [
    ...snapshots,
    {
      ...last,
      tick: last.tick + 1,
      events: [],
      cores: last.cores.map((core) => ({
        ...core,
        status: core.status === 'error' ? core.status : 'idle',
        line: null,
        job: null,
        runtime: null,
        heldRuntimes: [],
        currentFn: null,
        nativeFrame: false,
        callStack: [],
        visibleStack: [],
      })),
    },
  ];
}

export interface SimulationState {
  snapshots: Snapshot[];
  displayText: string;
  rawToDisplayLine: number[];
  blockEnds: Map<number, number>;
  error: string | null;
  tick: number;
  lastTick: number;
  playing: boolean;
  loop: boolean;
  settled: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  step: () => void;
  back: () => void;
  reset: () => void;
  togglePlay: () => void;
  toggleLoop: () => void;
}

export function useSimulation(
  module: SnippetModule,
  source: string,
  bundleMode: boolean,
  uiRuntime: boolean,
  screen: ScreenState | undefined,
  skipTicks: number,
  tickMs: number
): SimulationState {
  const screenKey = JSON.stringify(screen ?? null);
  const run = useMemo(() => {
    try {
      const snapshots = withFinalStep(
        simulate(module, source, {
          bundleMode,
          uiRuntime,
          screen: (JSON.parse(screenKey) as ScreenState | null) ?? undefined,
          skipTicks,
        })
      );
      const display = displaySource(source);
      return {
        snapshots,
        displayText: display.text,
        rawToDisplayLine: display.rawToDisplayLine,
        blockEnds: display.blockEnds,
        error: null,
      };
    } catch (error) {
      return {
        snapshots: [],
        displayText: source,
        rawToDisplayLine: [],
        blockEnds: new Map<number, number>(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [module, source, bundleMode, uiRuntime, screenKey, skipTicks]);

  const lastTick = Math.max(run.snapshots.length - 1, 0);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  const [settled, setSettled] = useState(true);

  useEffect(() => {
    setTick(0);
    setPlaying(false);
    startedRef.current = false;
  }, [run]);

  useEffect(() => {
    const element = containerRef.current;
    if (element === null || startedRef.current) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      startedRef.current = true;
      setPlaying(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startedRef.current = true;
          setPlaying(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [run]);

  useEffect(() => {
    if (tick === 0) {
      setSettled(true);
      return;
    }
    setSettled(false);
    const id = setTimeout(() => setSettled(true), PROPAGATION_MS);
    return () => clearTimeout(id);
  }, [tick, run]);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const id = setInterval(() => {
      setTick((current) => {
        if (current < lastTick) {
          return current + 1;
        }
        return loop ? 0 : current;
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [playing, loop, tickMs, lastTick]);

  useEffect(() => {
    if (tick >= lastTick && !loop) {
      setPlaying(false);
    }
  }, [tick, lastTick, loop]);

  const step = useCallback(() => {
    setPlaying(false);
    setTick((current) => Math.min(current + 1, lastTick));
  }, [lastTick]);
  const back = useCallback(() => {
    setPlaying(false);
    setTick((current) => Math.max(current - 1, 0));
  }, []);
  const reset = useCallback(() => {
    setPlaying(false);
    setTick(0);
  }, []);
  const togglePlay = useCallback(() => {
    setTick((current) => (current >= lastTick ? 0 : current));
    setPlaying((current) => !current);
  }, [lastTick]);
  const toggleLoop = useCallback(() => {
    setLoop((current) => !current);
  }, []);

  return {
    ...run,
    tick,
    lastTick,
    playing,
    loop,
    settled,
    containerRef,
    step,
    back,
    reset,
    togglePlay,
    toggleLoop,
  };
}

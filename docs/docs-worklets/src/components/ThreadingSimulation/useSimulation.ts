import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { simulate } from '@site/src/simulation';
import type {
  ExternalInput,
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
      memory: last.memory.map((cell) => ({ ...cell, accessedBy: null })),
      cores: last.cores.map((core) => ({
        ...core,
        status: core.status === 'error' ? core.status : 'idle',
        line: null,
        job: null,
        runtime: null,
        heldRuntimes: [],
        waitingFor: null,
        blockReason: null,
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
  propagationMs: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  inputs: ExternalInput[];
  press: (fn: string) => void;
  step: () => void;
  back: () => void;
  reset: () => void;
  pause: () => void;
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
  durationTicks: number | undefined,
  tickMs: number,
  enabled: boolean,
  alwaysOn: boolean,
  boilerplate: boolean
): SimulationState {
  const display = useMemo(() => {
    try {
      return displaySource(source, { boilerplate });
    } catch {
      return {
        text: source,
        rawToDisplayLine: [] as number[],
        blockEnds: new Map<number, number>(),
      };
    }
  }, [source, boilerplate]);
  const screenKey = JSON.stringify(screen ?? null);
  const [inputs, setInputs] = useState<ExternalInput[]>([]);
  const tickRef = useRef(0);
  const base = useMemo(
    () => ({
      module,
      source,
      bundleMode,
      uiRuntime,
      screenKey,
      skipTicks,
      durationTicks,
    }),
    [module, source, bundleMode, uiRuntime, screenKey, skipTicks, durationTicks]
  );
  const run = useMemo(() => {
    try {
      const snapshots = withFinalStep(
        simulate(module, source, {
          bundleMode,
          uiRuntime,
          screen: (JSON.parse(screenKey) as ScreenState | null) ?? undefined,
          skipTicks,
          durationTicks,
          inputs,
        })
      );
      return { snapshots, error: null };
    } catch (error) {
      return {
        snapshots: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [
    module,
    source,
    bundleMode,
    uiRuntime,
    screenKey,
    skipTicks,
    durationTicks,
    inputs,
  ]);

  const lastTick = Math.max(run.snapshots.length - 1, 0);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(alwaysOn);
  const [loop, setLoop] = useState(alwaysOn);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  const [settled, setSettled] = useState(true);

  useEffect(() => {
    setTick(0);
    setInputs([]);
    setPlaying(alwaysOn);
    startedRef.current = alwaysOn;
  }, [base, alwaysOn]);

  useEffect(() => {
    tickRef.current = tick;
    if (tick === 0) {
      setInputs((current) => (current.length === 0 ? current : []));
    }
  }, [tick]);

  useEffect(() => {
    const element = containerRef.current;
    if (!enabled || element === null || startedRef.current) {
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
  }, [base, enabled]);

  const propagationMs = Math.min(PROPAGATION_MS, Math.floor(tickMs / 2));
  useEffect(() => {
    const delay = propagationMs;
    if (tick === 0 || delay === 0) {
      setSettled(true);
      return;
    }
    setSettled(false);
    const id = setTimeout(() => setSettled(true), delay);
    return () => clearTimeout(id);
  }, [tick, run, propagationMs]);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const advance = () => {
      setTick((current) => {
        if (current < lastTick) {
          return current + 1;
        }
        return loop ? 0 : current;
      });
    };
    if (tickMs <= 0) {
      let frame = requestAnimationFrame(function step() {
        advance();
        frame = requestAnimationFrame(step);
      });
      return () => cancelAnimationFrame(frame);
    }
    const id = setInterval(advance, tickMs);
    return () => clearInterval(id);
  }, [playing, loop, tickMs, lastTick]);

  useEffect(() => {
    if (tick >= lastTick && !loop && !alwaysOn) {
      setPlaying(false);
    }
  }, [tick, lastTick, loop, alwaysOn]);

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
  const pause = useCallback(() => {
    setPlaying(false);
  }, []);
  const press = useCallback(
    (fn: string) => {
      const at = tickRef.current + 1;
      if (at > lastTick) {
        return;
      }
      setInputs((current) =>
        current.some((input) => input.tick === at)
          ? current
          : [
              ...current,
              { tick: at, core: 'ui', fn, args: [current.length + 1] },
            ]
      );
    },
    [lastTick]
  );

  return {
    ...run,
    displayText: display.text,
    rawToDisplayLine: display.rawToDisplayLine,
    blockEnds: display.blockEnds,
    tick,
    lastTick,
    playing,
    loop,
    settled,
    propagationMs,
    containerRef,
    inputs,
    press,
    step,
    back,
    reset,
    pause,
    togglePlay,
    toggleLoop,
  };
}

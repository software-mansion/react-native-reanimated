import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  APP_MS_PER_TICK,
  MIN_TICK_MS,
  Machine,
  loadSnippet,
} from '@site/src/simulation';
import type {
  ScreenState,
  Snapshot,
  SnippetModule,
} from '@site/src/simulation';
import { displaySource } from '@site/src/simulation/display';

export const PROPAGATION_MS = 100;

interface SessionOptions {
  bundleMode: boolean;
  uiRuntime: boolean;
  screen: ScreenState | undefined;
  skipTicks: number;
  bootTicks: number;
  durationTicks: number | undefined;
}

class Session {
  machine: Machine | null = null;
  snapshots: Snapshot[] = [];
  error: string | null = null;
  finished = false;
  presses = 0;
  clock = 0;

  constructor(
    private readonly module: SnippetModule,
    private readonly source: string,
    private readonly options: SessionOptions
  ) {
    this.reset();
  }

  reset(): void {
    this.presses = 0;
    this.finished = false;
    this.clock = 0;
    try {
      const machine = new Machine(loadSnippet(this.module, this.source), {
        bundleMode: this.options.bundleMode,
        uiRuntime: this.options.uiRuntime,
        screen: this.options.screen,
        bootTicks: this.options.bootTicks,
      });
      machine.skip(this.options.skipTicks);
      this.machine = machine;
      this.snapshots = [machine.snapshot()];
      this.error = null;
    } catch (error) {
      this.machine = null;
      this.snapshots = [];
      this.error = error instanceof Error ? error.message : String(error);
      this.finished = true;
    }
  }

  get atEnd(): boolean {
    return (
      this.finished ||
      (this.options.durationTicks !== undefined &&
        this.snapshots.length > this.options.durationTicks)
    );
  }

  advance(): boolean {
    if (this.machine === null || this.atEnd) {
      return false;
    }
    this.clock += APP_MS_PER_TICK;
    const snapshot = this.machine.tick(this.clock);
    this.snapshots.push(snapshot);
    if (snapshot.finished) {
      this.snapshots.push(finalStep(snapshot));
      this.finished = true;
    }
    return true;
  }

  press(fn: string): void {
    if (this.machine === null || this.atEnd) {
      return;
    }
    const accepted = this.machine.addInput({
      tick: this.machine.currentTick + 1,
      core: 'ui',
      fn,
      args: [this.presses + 1],
    });
    if (accepted) {
      this.presses += 1;
    }
  }
}

function finalStep(last: Snapshot): Snapshot {
  return {
    ...last,
    tick: last.tick + 1,
    events: [],
    memory: last.memory.map((cell) => ({ ...cell, accessedBy: null })),
    resources: last.resources.map((resource) => ({
      ...resource,
      holder: resource.kind === 'loop' ? resource.holder : null,
    })),
    cores: last.cores.map((core) => ({
      ...core,
      status: core.status === 'error' ? core.status : 'idle',
      line: null,
      job: null,
      runtime: null,
      heldRuntimes: [],
      waitingFor: null,
      currentFn: null,
      nativeFrame: false,
      callStack: [],
      visibleStack: [],
    })),
  };
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
  bootTicks: number,
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
  const session = useMemo(
    () =>
      new Session(module, source, {
        bundleMode,
        uiRuntime,
        screen: (JSON.parse(screenKey) as ScreenState | null) ?? undefined,
        skipTicks,
        bootTicks,
        durationTicks,
      }),
    [
      module,
      source,
      bundleMode,
      uiRuntime,
      screenKey,
      skipTicks,
      bootTicks,
      durationTicks,
    ]
  );

  const [tick, setTick] = useState(0);
  const [, setVersion] = useState(0);
  const [playing, setPlaying] = useState(alwaysOn);
  const [loop, setLoop] = useState(alwaysOn);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  const tickRef = useRef(0);
  const loopRef = useRef(loop);
  const [settledTick, setSettledTick] = useState(0);
  tickRef.current = tick;
  loopRef.current = loop;

  useEffect(() => {
    setTick(0);
    setPlaying(alwaysOn);
    startedRef.current = alwaysOn;
  }, [session, alwaysOn]);

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
  }, [session, enabled]);

  const propagationMs = Math.min(PROPAGATION_MS, Math.floor(tickMs / 2));
  useEffect(() => {
    if (tick === 0 || propagationMs === 0) {
      return;
    }
    const id = setTimeout(() => setSettledTick(tick), propagationMs);
    return () => clearTimeout(id);
  }, [tick, session, propagationMs]);
  const settled = tick === 0 || propagationMs === 0 || settledTick === tick;

  const advance = useCallback((): 'moved' | 'end' => {
    const current = tickRef.current;
    if (current < session.snapshots.length - 1) {
      setTick(current + 1);
      return 'moved';
    }
    if (session.advance()) {
      setVersion((version) => version + 1);
      setTick(current + 1);
      return 'moved';
    }
    return 'end';
  }, [session]);

  const restart = useCallback(() => {
    session.reset();
    setVersion((version) => version + 1);
    setTick(0);
  }, [session]);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const run = () => {
      if (advance() === 'end') {
        if (loopRef.current) {
          restart();
        } else if (!alwaysOn) {
          setPlaying(false);
        }
      }
    };
    const id = setInterval(run, Math.max(tickMs, MIN_TICK_MS));
    return () => clearInterval(id);
  }, [playing, tickMs, advance, restart, alwaysOn]);

  const lastTick = session.atEnd
    ? Math.max(session.snapshots.length - 1, 0)
    : Number.POSITIVE_INFINITY;

  const step = useCallback(() => {
    setPlaying(false);
    advance();
  }, [advance]);
  const back = useCallback(() => {
    setPlaying(false);
    setTick((current) => Math.max(current - 1, 0));
  }, []);
  const reset = useCallback(() => {
    setPlaying(false);
    restart();
  }, [restart]);
  const togglePlay = useCallback(() => {
    if (session.atEnd && tickRef.current >= session.snapshots.length - 1) {
      restart();
    }
    setPlaying((current) => !current);
  }, [session, restart]);
  const toggleLoop = useCallback(() => {
    setLoop((current) => !current);
  }, []);
  const pause = useCallback(() => {
    setPlaying(false);
  }, []);
  const press = useCallback(
    (fn: string) => {
      session.press(fn);
    },
    [session]
  );

  return {
    snapshots: session.snapshots,
    error: session.error,
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
    press,
    step,
    back,
    reset,
    pause,
    togglePlay,
    toggleLoop,
  };
}

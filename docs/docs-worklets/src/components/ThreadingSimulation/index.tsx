import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';

import type {
  ScreenState,
  Snapshot,
  SnippetModule,
} from '@site/src/simulation';

import CodePanel from './CodePanel';
import type { LineHistory } from './CodePanel';
import CpuPanel, { CORE_COUNT } from './CpuPanel';
import ForkBus from './ForkBus';
import type { BusSlot } from './ForkBus';
import MemoryPanel from './MemoryPanel';
import Panel from './Panel';
import Phone from './Phone';
import { runtimeClass, shortName } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';
import styles from './styles.module.css';
import { useSimulation } from './useSimulation';

interface ThreadingSimulationProps {
  module: SnippetModule;
  source: string;
  title?: string;
  bundleMode?: boolean;
  uiRuntime?: boolean;
  phone?: boolean;
  screen?: ScreenState;
  showMemory?: boolean;
  showConsole?: boolean;
  skipTicks?: number;
  tickMs?: number;
}

const DEFAULT_TICK_MS = 1800;

export default function ThreadingSimulation({
  module,
  source,
  title,
  bundleMode = false,
  uiRuntime = true,
  phone = false,
  screen,
  showMemory = true,
  showConsole = true,
  skipTicks = 0,
  tickMs = DEFAULT_TICK_MS,
}: ThreadingSimulationProps) {
  const simulation = useSimulation(
    module,
    source,
    bundleMode,
    uiRuntime,
    screen,
    skipTicks,
    tickMs
  );

  const logs = collectLogs(simulation.snapshots, simulation.tick - 1);
  const consoleRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const element = consoleRef.current;
    if (element !== null) {
      element.scrollTop = element.scrollHeight;
    }
  }, [logs.length]);

  if (simulation.error !== null) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>
          Cannot simulate this snippet: {simulation.error}
        </p>
        <pre>{source}</pre>
      </div>
    );
  }

  const snapshot = simulation.snapshots[simulation.tick];
  const runtimes = collectRuntimes([snapshot]);
  const everRuntimes = collectRuntimes(simulation.snapshots);
  const activeSince = collectActiveSince(simulation.snapshots, simulation.tick);
  const steady = new Set(
    [...activeSince]
      .filter(([, since]) => since < simulation.tick)
      .map(([id]) => id)
  );
  const slots: BusSlot[] = Array.from({ length: CORE_COUNT }, (_, index) => {
    const runtime = runtimes[index];
    const since =
      runtime === undefined ? undefined : activeSince.get(runtime.id);
    return {
      index,
      runtime,
      activeSince: since,
      lineImpulse: since === undefined ? undefined : simulation.tick,
    };
  });
  const history = collectHistory(
    simulation.snapshots,
    simulation.settled ? simulation.tick : simulation.tick - 1,
    simulation.rawToDisplayLine
  );

  const redrawn =
    simulation.settled &&
    snapshot.events.some((event) => event.type === 'screen');
  const shownScreen = simulation.settled
    ? snapshot.screen
    : (simulation.snapshots[Math.max(simulation.tick - 1, 0)]?.screen ??
      snapshot.screen);

  return (
    <div className={styles.container} ref={simulation.containerRef}>
      {title !== undefined && <p className={styles.title}>{title}</p>}
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.button}
          onClick={simulation.reset}
          disabled={simulation.tick === 0}>
          Reset
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={simulation.back}
          disabled={simulation.tick === 0}>
          Back
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={simulation.step}
          disabled={simulation.tick >= simulation.lastTick}>
          Step
        </button>
        <button
          type="button"
          className={clsx(styles.button, styles.buttonPrimary)}
          onClick={simulation.togglePlay}>
          {simulation.playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className={clsx(
            styles.button,
            simulation.loop && styles.buttonActive
          )}
          onClick={simulation.toggleLoop}
          aria-pressed={simulation.loop}>
          Loop
        </button>
        <span className={styles.tickLabel}>
          tick {simulation.tick} / {simulation.lastTick}
        </span>
      </div>

      <div
        className={clsx(
          styles.scene,
          !showMemory && styles.sceneNoMemory,
          simulation.playing && styles.sceneRunning
        )}>
        <Panel title="Code" className={styles.areaCode}>
          <CodePanel
            code={simulation.displayText}
            runtimes={runtimes}
            cores={snapshot.cores}
            rawToDisplayLine={simulation.rawToDisplayLine}
            blockEnds={simulation.blockEnds}
            history={history}
            settled={simulation.settled}
          />
        </Panel>
        <div className={styles.areaSide}>
          {phone && <Phone screen={shownScreen} redrawn={redrawn} />}
          {showConsole && (
            <Panel title="Console" className={styles.consolePanel}>
              <div className={styles.console} ref={consoleRef}>
                {logs.length === 0 ? (
                  <span className={styles.consoleEmpty}>no output yet</span>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className={styles.consoleEntry}>
                      <span
                        className={clsx(
                          styles.badge,
                          runtimeClass(log.runtime)
                        )}>
                        {shortName(log.runtime.id)}
                      </span>
                      <span>{log.text}</span>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          )}
        </div>
        <ForkBus slots={slots} showDown={showMemory} />
        <Panel title="CPU" className={styles.areaCpu}>
          <CpuPanel runtimes={runtimes} cores={snapshot.cores} />
        </Panel>
        {showMemory && (
          <Panel title="Memory" className={styles.areaMemory}>
            <MemoryPanel
              runtimes={everRuntimes.filter((runtime) => runtime.hasRuntime)}
              present={new Set(runtimes.map((runtime) => runtime.id))}
              allRuntimes={runtimes}
              cores={snapshot.cores}
              rawToDisplayLine={simulation.rawToDisplayLine}
              settled={simulation.settled}
              steady={steady}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}

function collectRuntimes(snapshots: Snapshot[]): RuntimeDescriptor[] {
  const runtimes: RuntimeDescriptor[] = [];
  for (const snapshot of snapshots) {
    for (const core of snapshot.cores) {
      if (!runtimes.some((candidate) => candidate.id === core.id)) {
        runtimes.push({
          id: core.id,
          label: core.label,
          thread: core.thread,
          kind: core.kind,
          hasRuntime: core.hasRuntime,
          coreIndex: runtimes.length,
        });
      }
    }
  }
  return runtimes;
}

function collectActiveSince(
  snapshots: Snapshot[],
  tick: number
): Map<string, number> {
  const since = new Map<string, number>();
  const current = snapshots[tick];
  for (const core of current.cores) {
    if (core.status !== 'running') {
      continue;
    }
    let start = tick;
    while (start > 0) {
      const previous = snapshots[start - 1].cores.find(
        (candidate) => candidate.id === core.id
      );
      if (previous?.status !== 'running') {
        break;
      }
      start -= 1;
    }
    since.set(core.id, start);
  }
  return since;
}

function collectHistory(
  snapshots: Snapshot[],
  upToTick: number,
  rawToDisplayLine: number[]
): LineHistory {
  const history: LineHistory = new Map();
  for (const snapshot of snapshots.slice(0, upToTick + 1)) {
    for (const event of snapshot.events) {
      if (event.type !== 'exec') {
        continue;
      }
      const displayLine = rawToDisplayLine[event.line] ?? -1;
      if (displayLine < 0) {
        continue;
      }
      const ids = history.get(displayLine) ?? new Set<string>();
      ids.add(event.core);
      history.set(displayLine, ids);
    }
  }
  return history;
}

function collectLogs(snapshots: Snapshot[], upToTick: number) {
  const runtimes = collectRuntimes(snapshots);
  const logs: { runtime: RuntimeDescriptor; text: string }[] = [];
  for (const snapshot of snapshots.slice(0, upToTick + 1)) {
    for (const event of snapshot.events) {
      if (event.type === 'log') {
        const runtime = runtimes.find(
          (candidate) => candidate.id === event.core
        );
        if (runtime !== undefined) {
          logs.push({ runtime, text: event.text });
        }
      }
    }
  }
  return logs;
}

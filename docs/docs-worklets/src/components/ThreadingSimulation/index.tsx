import React, { useEffect, useRef, useState } from 'react';
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
import { badgeName, runtimeClass } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';
import styles from './styles.module.css';
import { useFrameInterval } from './useFrameInterval';
import { useSimulation } from './useSimulation';

interface ThreadingSimulationProps {
  module: SnippetModule;
  source: string;
  title?: string;
  defaultOpen?: boolean;
  alwaysOn?: boolean;
  bundleMode?: boolean;
  uiRuntime?: boolean;
  phone?: boolean;
  pressHandler?: string;
  screen?: ScreenState;
  showMemory?: boolean;
  showConsole?: boolean;
  skipTicks?: number;
  durationTicks?: number;
  collapsibleCode?: boolean;
  codeColumns?: number;
  boilerplateToggle?: boolean;
  codeOpen?: boolean;
  onCodeOpenChange?: (open: boolean) => void;
  tickMs?: number;
}

const DEFAULT_TICK_MS = 1800;
const MIN_PULSE_FRAMES = 4;

export default function ThreadingSimulation({
  module,
  source,
  title,
  defaultOpen = false,
  alwaysOn = false,
  bundleMode = false,
  uiRuntime = true,
  phone = false,
  pressHandler,
  screen,
  showMemory = true,
  showConsole = true,
  skipTicks = 0,
  durationTicks,
  collapsibleCode = false,
  codeColumns = 1,
  boilerplateToggle = true,
  codeOpen: controlledCodeOpen,
  onCodeOpenChange,
  tickMs = DEFAULT_TICK_MS,
}: ThreadingSimulationProps) {
  const [open, setOpen] = useState(defaultOpen || alwaysOn);
  const [localCodeOpen, setLocalCodeOpen] = useState(!collapsibleCode);
  const [boilerplate, setBoilerplate] = useState(false);
  const frameMs = useFrameInterval();
  const codeOpen = controlledCodeOpen ?? localCodeOpen;
  const setCodeOpen = (next: boolean) => {
    setLocalCodeOpen(next);
    onCodeOpenChange?.(next);
  };
  const simulation = useSimulation(
    module,
    source,
    bundleMode,
    uiRuntime,
    screen,
    skipTicks,
    durationTicks,
    tickMs,
    open,
    alwaysOn,
    boilerplate
  );
  const boilerplateButton = boilerplateToggle && (
    <button
      type="button"
      className={styles.boilerplateToggle}
      onClick={() => setBoilerplate((current) => !current)}
      aria-pressed={boilerplate}>
      {boilerplate ? 'Hide boilerplate' : 'See boilerplate'}
    </button>
  );

  const logs = collectLogs(simulation.snapshots, simulation.tick - 1);
  const shownAtRef = useRef(new Map<number, number>());
  useEffect(() => {
    if (simulation.tick === 0) {
      shownAtRef.current.clear();
    }
    shownAtRef.current.set(simulation.tick, Date.now());
  }, [simulation.tick]);

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
  const usedRuntimes = collectUsedRuntimes(simulation.snapshots);
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
    simulation.tick,
    simulation.settled,
    simulation.rawToDisplayLine
  );

  const redrawn =
    simulation.settled &&
    snapshot.events.some((event) => event.type === 'screen');
  const shownScreen = simulation.settled
    ? snapshot.screen
    : (simulation.snapshots[Math.max(simulation.tick - 1, 0)]?.screen ??
      snapshot.screen);

  if (!open) {
    return (
      <div className={styles.container}>
        {title !== undefined && <p className={styles.title}>{title}</p>}
        <div className={styles.collapsed}>
          <CodePanel
            code={simulation.displayText}
            runtimes={[]}
            cores={[]}
            rawToDisplayLine={simulation.rawToDisplayLine}
            blockEnds={simulation.blockEnds}
            history={new Map()}
            settled
            columns={codeColumns}
          />
          {boilerplateToggle && (
            <div className={styles.codeFooter}>{boilerplateButton}</div>
          )}
          <button
            type="button"
            className={styles.expand}
            onClick={() => setOpen(true)}
            aria-expanded={false}>
            <span className={styles.expandChevron} aria-hidden="true" />
            See how it works
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {title !== undefined && <p className={styles.title}>{title}</p>}
      <div className={styles.body} ref={simulation.containerRef}>
        {!alwaysOn && (
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
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                simulation.pause();
                setOpen(false);
              }}>
              Hide
            </button>
          </div>
        )}

        <div
          className={clsx(
            styles.scene,
            phone && styles.sceneWithPhone,
            !showMemory && styles.sceneNoMemory,
            simulation.playing && styles.sceneRunning
          )}
          style={
            {
              '--propagation': `${simulation.propagationMs}ms`,
            } as React.CSSProperties
          }>
          <Panel title="Code" className={styles.areaCode}>
            {codeOpen && (
              <CodePanel
                code={simulation.displayText}
                runtimes={runtimes}
                cores={snapshot.cores}
                rawToDisplayLine={simulation.rawToDisplayLine}
                blockEnds={simulation.blockEnds}
                history={history}
                settled={simulation.settled}
                columns={codeColumns}
              />
            )}
            <div
              className={clsx(
                styles.codeFooter,
                collapsibleCode && styles.codeFooterCollapsible
              )}>
              {collapsibleCode && (
                <button
                  type="button"
                  className={clsx(
                    styles.codeToggle,
                    codeOpen && styles.codeToggleOpen
                  )}
                  onClick={() => setCodeOpen(!codeOpen)}
                  aria-expanded={codeOpen}>
                  <span className={styles.expandChevron} aria-hidden="true" />
                  {codeOpen ? 'Hide code' : 'Show code'}
                </button>
              )}
              {(codeOpen || !collapsibleCode) && boilerplateButton}
            </div>
          </Panel>
          {phone && (
            <div className={styles.areaPhone}>
              <Phone
                screen={shownScreen}
                redrawn={redrawn}
                onPress={
                  pressHandler === undefined
                    ? undefined
                    : () => simulation.press(pressHandler)
                }
              />
            </div>
          )}
          <div className={styles.areaSide}>
            {showConsole && (
              <Panel title="Console" className={styles.consolePanel}>
                <div className={styles.console}>
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
                          {badgeName(log.runtime.id)}
                        </span>
                        <span>{log.text}</span>
                        <span className={styles.consoleTime}>
                          {formatTime(shownAtRef.current.get(log.tick + 1))}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            )}
          </div>
          <ForkBus
            slots={slots}
            showDown={showMemory}
            pulse={simulation.propagationMs >= MIN_PULSE_FRAMES * frameMs}
          />
          <Panel title="CPU" className={styles.areaCpu}>
            <CpuPanel
              runtimes={runtimes}
              cores={snapshot.cores}
              rawToDisplayLine={simulation.rawToDisplayLine}
            />
          </Panel>
          {showMemory && (
            <Panel title="Memory" className={styles.areaMemory}>
              <MemoryPanel
                runtimes={everRuntimes.filter(
                  (runtime) =>
                    runtime.hasRuntime &&
                    (runtime.kind !== 'ui' || usedRuntimes.has(runtime.id))
                )}
                present={new Set(runtimes.map((runtime) => runtime.id))}
                allRuntimes={runtimes}
                cores={snapshot.cores}
                memory={snapshot.memory}
                settled={simulation.settled}
                steady={steady}
              />
            </Panel>
          )}
        </div>
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

function collectUsedRuntimes(snapshots: Snapshot[]): Set<string> {
  const used = new Set<string>();
  for (const snapshot of snapshots) {
    for (const core of snapshot.cores) {
      if (core.status !== 'idle' || core.pending.length > 0) {
        used.add(core.id);
      }
      for (const runtime of core.heldRuntimes) {
        used.add(runtime);
      }
    }
  }
  return used;
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
  currentTick: number,
  settled: boolean,
  rawToDisplayLine: number[]
): LineHistory {
  const history: LineHistory = new Map();
  const seenByCore = new Map<string, Set<number>>();
  const oldest = Math.max(currentTick - HISTORY_DEPTH, 0);
  for (let tick = currentTick; tick >= oldest; tick--) {
    if (tick === currentTick && !settled) {
      continue;
    }
    const snapshot = snapshots[tick];
    if (snapshot === undefined) {
      continue;
    }
    const age = currentTick - tick;
    for (const event of [...snapshot.events].reverse()) {
      if (event.type !== 'exec') {
        continue;
      }
      const displayLine = rawToDisplayLine[event.line] ?? -1;
      if (displayLine < 0) {
        continue;
      }
      const seen = seenByCore.get(event.core) ?? new Set<number>();
      if (seen.has(displayLine)) {
        continue;
      }
      seen.add(displayLine);
      seenByCore.set(event.core, seen);
      const ages = history.get(displayLine) ?? new Map<string, number>();
      ages.set(event.core, age);
      history.set(displayLine, ages);
    }
  }
  return history;
}

const HISTORY_DEPTH = 3;

function collectLogs(snapshots: Snapshot[], upToTick: number) {
  const runtimes = collectRuntimes(snapshots);
  const logs: { runtime: RuntimeDescriptor; text: string; tick: number }[] = [];
  for (const snapshot of snapshots.slice(0, upToTick + 1)) {
    for (const event of snapshot.events) {
      if (event.type === 'log') {
        const runtime = runtimes.find(
          (candidate) => candidate.id === event.core
        );
        if (runtime !== undefined) {
          logs.push({ runtime, text: event.text, tick: snapshot.tick });
        }
      }
    }
  }
  return logs;
}

function formatTime(timestamp: number | undefined): string {
  if (timestamp === undefined) {
    return '';
  }
  const date = new Date(timestamp);
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

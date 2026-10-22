import React, { useId, useState } from 'react';
import clsx from 'clsx';

import type {
  ScreenState,
  Snapshot,
  SnippetModule,
} from '@site/src/simulation';
import CodePanel from './CodePanel';
import type { LineHistory } from './CodePanel';
import CpuPanel from './CpuPanel';
import Disclosure from './Disclosure';
import Connections from './Connections';
import MemoryPanel from './MemoryPanel';
import Panel from './Panel';
import Phone from './Phone';
import { badgeName, runtimeClass, threadName } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';
import styles from './styles.module.css';
import TransportIcon from './TransportIcon';
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
  onTickMsChange?: (tickMs: number) => void;
  cpuFooter?: React.ReactNode;
  bootTicks?: number;
}

const DEFAULT_TICK_MS = 1000;
export const TICK_STEP_MS = 50;
export const TICK_MIN_MS = 16;
export const TICK_MAX_MS = 1000;

export function snapTick(value: number): number {
  if (value < TICK_STEP_MS) return TICK_MIN_MS;
  return Math.min(TICK_MAX_MS, Math.round(value / TICK_STEP_MS) * TICK_STEP_MS);
}

export function formatTick(ms: number): string {
  return ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`;
}

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
  tickMs: controlledTickMs,
  onTickMsChange,
  cpuFooter,
  bootTicks = 0,
}: ThreadingSimulationProps) {
  const [open, setOpen] = useState(defaultOpen || alwaysOn);
  const [hasOpened, setHasOpened] = useState(open);
  const disclosureId = useId();
  const [localTickMs, setLocalTickMs] = useState(
    controlledTickMs ?? DEFAULT_TICK_MS
  );
  const [localCodeOpen, setLocalCodeOpen] = useState(!collapsibleCode);
  const [boilerplate, setBoilerplate] = useState(false);
  const tickMs =
    onTickMsChange === undefined
      ? localTickMs
      : (controlledTickMs ?? DEFAULT_TICK_MS);
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
    bootTicks,
    durationTicks,
    tickMs,
    open,
    alwaysOn,
    boilerplate
  );

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
  // Only use history up to the displayed tick: stepping back must not reveal future runtimes.
  const past = simulation.snapshots.slice(0, simulation.tick + 1);
  const everRuntimes = collectRuntimes(past);
  const usedRuntimes = collectUsedRuntimes(past, source);
  const activeSince = collectActiveSince(simulation.snapshots, simulation.tick);
  const steady = new Set(
    [...activeSince]
      .filter(([, since]) => since < simulation.tick)
      .map(([id]) => id)
  );
  const history = collectHistory(
    simulation.snapshots,
    simulation.tick,
    simulation.rawToDisplayLine
  );
  const logs = collectLogs(simulation.snapshots, simulation.tick - 1);
  const shownScreen = simulation.settled
    ? snapshot.screen
    : (simulation.snapshots[Math.max(simulation.tick - 1, 0)]?.screen ??
      snapshot.screen);
  const transfers = snapshot.events.filter(
    (event) => event.type === 'scheduled'
  );
  const nameOf = (id: string) => {
    const runtime = runtimes.find((candidate) => candidate.id === id);
    return runtime === undefined ? id : threadName(runtime);
  };
  const code = (
    <CodePanel
      code={simulation.displayText}
      runtimes={runtimes}
      cores={snapshot.cores}
      rawToDisplayLine={simulation.rawToDisplayLine}
      blockEnds={simulation.blockEnds}
      history={history}
      tickMs={tickMs}
      columns={codeColumns}
    />
  );
  const boilerplateButton = boilerplateToggle && (
    <button
      type="button"
      className={styles.boilerplateToggle}
      onClick={() => setBoilerplate((current) => !current)}
      aria-pressed={boilerplate}>
      {boilerplate ? 'Hide imports' : 'Show imports'}
    </button>
  );

  const codePanel = (
    <Panel
      title="Code"
      className={styles.areaCode}
      codePanel
      help="Colours connect each executing thread to its current code line. Recently executed lines fade over the next three ticks.">
      {code}
      <div className={styles.codeFooter}>{boilerplateButton}</div>
    </Panel>
  );
  const toolbar = (
    <div
      className={styles.toolbar}
      data-sim-obstacle
      ref={simulation.containerRef}
      role="group"
      aria-label="Simulation playback">
      <div className={styles.transport}>
        <button
          type="button"
          className={clsx(styles.button, styles.buttonPrimary)}
          onClick={simulation.togglePlay}
          aria-label={simulation.playing ? 'Pause' : 'Play'}>
          <TransportIcon name={simulation.playing ? 'pause' : 'play'} />
          <span className={styles.playLabel}>
            {simulation.playing ? 'Pause' : 'Play'}
          </span>
        </button>
        <button
          type="button"
          className={clsx(styles.button, styles.buttonIcon)}
          onClick={simulation.back}
          disabled={simulation.tick === 0}
          aria-label="Back one tick"
          title="Back one tick">
          <TransportIcon name="back" />
        </button>
        <button
          type="button"
          className={clsx(styles.button, styles.buttonIcon)}
          onClick={simulation.step}
          disabled={simulation.tick >= simulation.lastTick}
          aria-label="Step one tick"
          title="Step one tick">
          <TransportIcon name="step" />
        </button>
        <button
          type="button"
          className={clsx(styles.button, styles.buttonIcon)}
          onClick={simulation.reset}
          disabled={simulation.tick === 0}
          aria-label="Reset"
          title="Reset">
          <TransportIcon name="reset" />
        </button>
        <button
          type="button"
          className={clsx(
            styles.button,
            styles.buttonIcon,
            simulation.loop && styles.buttonActive
          )}
          onClick={simulation.toggleLoop}
          aria-pressed={simulation.loop}
          aria-label="Loop"
          title="Loop">
          <TransportIcon name="loop" />
        </button>
      </div>
      <span className={styles.tickLabel}>
        Tick <strong>{simulation.tick}</strong>
        {Number.isFinite(simulation.lastTick) && ` / ${simulation.lastTick}`}
      </span>
      <label className={styles.speed}>
        <span className={styles.speedLabel}>Step duration</span>
        <input
          type="range"
          className={styles.speedSlider}
          min={TICK_MIN_MS}
          max={TICK_MAX_MS}
          step={1}
          value={tickMs}
          onChange={(event) => {
            const next = snapTick(Number(event.target.value));
            setLocalTickMs(next);
            onTickMsChange?.(next);
          }}
          aria-label="Tick length in milliseconds"
        />
        <span className={styles.speedValue}>{formatTick(tickMs)}</span>
      </label>
    </div>
  );
  const activity = (
    <div
      className={styles.activity}
      data-sim-obstacle
      aria-label="Current scheduling activity">
      {transfers.length > 0 ? (
        transfers.map((event, index) => (
          <span key={index}>
            <strong>{nameOf(event.core)}</strong> queued{' '}
            <code>{event.job}</code> on <strong>{nameOf(event.target)}</strong>
          </span>
        ))
      ) : (
        <span>
          {codeOpen
            ? 'Follow the highlighted line and its matching thread colour.'
            : 'Compare the threads and press the app button to try it.'}
        </span>
      )}
      {collapsibleCode && (
        <button
          type="button"
          className={styles.codeToggle}
          onClick={() => setCodeOpen(!codeOpen)}
          aria-expanded={codeOpen}>
          {codeOpen ? 'Hide code' : 'Show code'}
        </button>
      )}
    </div>
  );
  const legend = (
    <div className={styles.connectionLegend} data-sim-obstacle>
      <span>
        <i className={styles.legendFlow} /> Thread → runtime in use
      </span>
      <span>
        <i className={styles.legendQueue} /> Job queued
      </span>
    </div>
  );
  const machine = (
    <div className={styles.machineArea}>
      <div
        className={clsx(
          styles.executionGrid,
          phone && styles.executionWithPhone
        )}>
        <Panel
          title="Threads"
          className={styles.areaThreads}
          help="A thread executes code. A synchronous call can borrow another runtime while staying on the same thread.">
          <CpuPanel
            runtimes={runtimes}
            cores={snapshot.cores}
            rawToDisplayLine={simulation.rawToDisplayLine}
          />
          {cpuFooter}
        </Panel>
        {showMemory && (
          <Panel
            title="Runtimes & memory"
            className={styles.areaMemory}
            help="A runtime holds JavaScript state. Its event loop queues work and pauses while another thread borrows the runtime. Shareable Hosts store values here; Guests refer to values on another runtime. Synchronizables live in native memory, accessible from any thread.">
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
        {phone && (
          <Panel
            title="App output"
            className={styles.areaPhone}
            connectionNode="output"
            help="The UI thread updates the app screen. Press the button to queue an input event and follow its result.">
            <Phone
              screen={shownScreen}
              redrawn={
                simulation.settled &&
                snapshot.events.some((event) => event.type === 'screen')
              }
              onPress={
                pressHandler === undefined
                  ? undefined
                  : () => simulation.press(pressHandler)
              }
            />
            {!simulation.playing && (
              <p className={styles.outputHint}>
                Paused. Press Play or step forward to process input.
              </p>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
  const connections = (
    <Connections
      snapshot={snapshot}
      runtimes={runtimes}
      tick={simulation.tick}
      tickMs={tickMs}
      codeOpen={codeOpen}
      settled={simulation.settled}
      playing={open && simulation.playing}
    />
  );
  const consolePanel = showConsole && (
    <details className={styles.consolePanel} data-sim-obstacle open={!alwaysOn}>
      <summary className={styles.consoleSummary}>
        <span>
          Console <span className={styles.logCount}>{logs.length}</span>
        </span>
        <span className={styles.consolePreview}>
          {logs.at(-1)?.text ?? 'No output yet'}
        </span>
      </summary>
      <div
        className={styles.console}
        role="region"
        tabIndex={0}
        aria-label="Console output">
        {logs.length === 0 ? (
          <span className={styles.consoleEmpty}>
            Output appears here as the code runs.
          </span>
        ) : (
          [...logs].reverse().map((log, index) => (
            <div key={index} className={styles.consoleEntry}>
              <span className={clsx(styles.badge, runtimeClass(log.runtime))}>
                {badgeName(log.runtime.id)}
              </span>
              <span>{log.text}</span>
              <span className={styles.consoleTime}>tick {log.tick}</span>
            </div>
          ))
        )}
      </div>
    </details>
  );

  return (
    <div className={styles.container}>
      {title !== undefined && <p className={styles.title}>{title}</p>}
      <div className={styles.scene}>
        {alwaysOn ? (
          <>
            {toolbar}
            {activity}
            {legend}
            <div className={styles.workspace}>
              {codeOpen && codePanel}
              {machine}
              {connections}
            </div>
            {consolePanel}
          </>
        ) : (
          <div
            className={clsx(styles.workspace, styles.disclosureWorkspace)}
            data-expanded={open}>
            {codePanel}
            <button
              type="button"
              className={styles.disclosureToggle}
              data-sim-obstacle
              onClick={() => {
                if (open) simulation.pause();
                setHasOpened(true);
                setOpen(!open);
              }}
              aria-label={open ? 'Hide simulation' : 'Show simulation'}
              aria-expanded={open}
              aria-controls={disclosureId}>
              <span className={styles.disclosureLabel}>
                <strong>Simulation</strong>
                <span>Follow this code across threads and runtimes</span>
              </span>
              <span className={styles.disclosureAction}>
                {open ? 'Hide' : 'Show'}
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </span>
            </button>
            <Disclosure open={open} id={disclosureId}>
              <div className={styles.simulationBody}>
                {toolbar}
                {activity}
                {legend}
                {machine}
                {consolePanel}
              </div>
            </Disclosure>
            {hasOpened && connections}
          </div>
        )}
      </div>
    </div>
  );
}

function collectRuntimes(snapshots: Snapshot[]): RuntimeDescriptor[] {
  const runtimes: RuntimeDescriptor[] = [];
  for (const snapshot of snapshots) {
    for (const core of snapshot.cores) {
      const known = runtimes.find((candidate) => candidate.id === core.id);
      if (known !== undefined) {
        known.hasRuntime = known.hasRuntime || core.hasRuntime;
      } else {
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

function collectUsedRuntimes(
  snapshots: Snapshot[],
  source: string
): Set<string> {
  const used = new Set<string>();
  if (/OnUI|UIThread/.test(source)) {
    used.add('ui');
  }
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
  rawToDisplayLine: number[]
): LineHistory {
  const history: LineHistory = new Map();
  const seenByCore = new Map<string, Set<number>>();
  const oldest = Math.max(currentTick - HISTORY_DEPTH, 0);
  for (let tick = currentTick; tick >= oldest; tick--) {
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

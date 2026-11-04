import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import type {
  CoreSnapshot,
  ScreenState,
  Snapshot,
  SnippetModule,
} from '@site/src/simulation';
import CodePanel from './CodePanel';
import type { LineHistory } from './CodePanel';
import CpuPanel from './CpuPanel';
import Disclosure from './Disclosure';
import Connections from './Connections';
import { collectConsoleEntries } from './consoleEntries';
import PanelHelp from './PanelHelp';
import MemoryPanel from './MemoryPanel';
import Panel from './Panel';
import Phone from './Phone';
import { badgeName, runtimeClass, threadName } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';
import styles from './styles.module.css';
import TransportIcon from './TransportIcon';
import { useSimulation } from './useSimulation';
import { useFullscreen } from './useFullscreen';
import AnimatedGrid from './AnimatedGrid';

interface ThreadingSimulationProps {
  module: SnippetModule;
  source: string;
  title?: string;
  defaultOpen?: boolean;
  alwaysOn?: boolean;
  showControls?: boolean;
  bundleMode?: boolean;
  uiRuntime?: boolean;
  phone?: boolean;
  pressHandler?: string;
  screen?: ScreenState;
  showMemory?: boolean;
  showConsole?: boolean;
  collapsibleConsole?: boolean;
  coreCount?: number;
  autoplay?: boolean;
  skipTicks?: number;
  durationTicks?: number;
  collapsibleCode?: boolean;
  codeColumns?: number;
  boilerplateToggle?: boolean;
  codeOpen?: boolean;
  onCodeOpenChange?: (open: boolean) => void;
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  tickMs?: number;
  onTickMsChange?: (tickMs: number) => void;
  cpuFooter?: React.ReactNode;
  bootTicks?: number;
  skipIdleTicks?: boolean;
  showPastDue?: boolean;
}

const DEFAULT_TICK_MS = 1000;
const SIMULATION_INFO =
  'This is a simple simulation of a phone with four cores. It runs on a single thread and executes the cores in a fixed order, so every run gives the same result. Real hardware is not deterministic: on a real phone, threads interleave in ways that this simulation does not show.';
const IDLE_TICKS_INFO =
  'When code waits for a timer, for example requestAnimationFrame, some simulations show the waiting as idle ticks, and others skip the idle ticks to stay short.';
const SKIPS_IDLE_TICKS = 'This simulation skips idle ticks.';
const SHOWS_IDLE_TICKS = 'This simulation shows idle ticks.';
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
  showControls = true,
  bundleMode = false,
  uiRuntime = true,
  phone = false,
  pressHandler,
  screen,
  showMemory = true,
  showConsole = true,
  collapsibleConsole = true,
  coreCount = 4,
  autoplay = true,
  skipTicks = 0,
  durationTicks,
  collapsibleCode = false,
  codeColumns = 1,
  boilerplateToggle = true,
  codeOpen: controlledCodeOpen,
  onCodeOpenChange,
  fullscreen: controlledFullscreen,
  onFullscreenChange,
  tickMs: controlledTickMs,
  onTickMsChange,
  cpuFooter,
  bootTicks = 0,
  skipIdleTicks = false,
  showPastDue = true,
}: ThreadingSimulationProps) {
  const [open, setOpen] = useState(defaultOpen || alwaysOn);
  const [hasOpened, setHasOpened] = useState(open);
  const disclosureId = useId();
  const {
    fullscreen,
    expanded,
    setFullscreen,
    buttonRef,
    containerRef,
    transitioning,
  } = useFullscreen(controlledFullscreen, onFullscreenChange);
  const [localTickMs, setLocalTickMs] = useState(
    controlledTickMs ?? DEFAULT_TICK_MS
  );
  const [localCodeOpen, setLocalCodeOpen] = useState(!collapsibleCode);
  const [boilerplate, setBoilerplate] = useState(false);
  const [consoleOpenState, setConsoleOpen] = useState(
    !alwaysOn || !collapsibleConsole
  );
  const consoleOpen = consoleOpenState || !collapsibleConsole;
  const consoleRef = useRef<HTMLDivElement | null>(null);
  const consoleAtBottomRef = useRef(true);
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
    boilerplate,
    transitioning,
    autoplay,
    skipIdleTicks
  );

  useLayoutEffect(() => {
    const element = consoleRef.current;
    if (element !== null && consoleAtBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [simulation.tick, consoleOpen, open]);

  if (simulation.error !== null) {
    return (
      <div data-figure="ThreadingSimulation" className={styles.container}>
        <p className={styles.error}>
          Cannot simulate this snippet: {simulation.error}
        </p>
        <pre>{source}</pre>
      </div>
    );
  }

  const snapshot = simulation.snapshots[simulation.tick];
  const firstDisplayLine =
    simulation.firstLine === null
      ? -1
      : (simulation.rawToDisplayLine[simulation.firstLine] ?? -1);
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
  const logs = collectLogs(simulation.snapshots, simulation.tick);
  const shownScreen = simulation.settled
    ? snapshot.screen
    : (simulation.snapshots[Math.max(simulation.tick - 1, 0)]?.screen ??
      snapshot.screen);
  const transfers = snapshot.events.filter(
    (event) => event.type === 'scheduled'
  );
  const failedCore = snapshot.cores.find((core) => core.status === 'error');
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
      columns={alwaysOn ? codeColumns : 1}
      lineNumbers={!alwaysOn}
      upcomingLine={open && simulation.tick === 0 ? firstDisplayLine : -1}
      tick={simulation.tick}
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
      headerActions={boilerplateButton}
      help="Colours connect each executing thread to its current code line. Recently executed lines fade over the next three ticks.">
      {code}
    </Panel>
  );
  const toolbar = showControls && (
    <div
      className={styles.toolbar}
      data-sim-obstacle
      ref={simulation.containerRef}
      role="group"
      aria-label="Simulation playback">
      <AnimatedGrid animateResize resizeItems className={styles.toolbarGrid}>
        <button
          key="play"
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
          key="back"
          type="button"
          className={clsx(styles.button, styles.buttonIcon)}
          onClick={simulation.back}
          disabled={simulation.tick === 0}
          aria-label="Back one tick"
          title="Back one tick">
          <TransportIcon name="back" />
        </button>
        <button
          key="step"
          type="button"
          className={clsx(styles.button, styles.buttonIcon)}
          onClick={simulation.step}
          disabled={simulation.tick >= simulation.lastTick}
          aria-label="Step one tick"
          title="Step one tick">
          <TransportIcon name="step" />
        </button>
        <button
          key="reset"
          type="button"
          className={clsx(styles.button, styles.buttonIcon)}
          onClick={simulation.reset}
          disabled={simulation.tick === 0}
          aria-label="Reset"
          title="Reset">
          <TransportIcon name="reset" />
        </button>
        <button
          key="loop"
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
        <span key="tick" className={styles.tickLabel}>
          Tick <strong>{simulation.tick}</strong>
          {Number.isFinite(simulation.lastTick) && ` / ${simulation.lastTick}`}
        </span>
        <label key="speed" className={styles.speed}>
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
            onKeyDown={(event) => {
              const direction =
                event.key === 'ArrowRight' || event.key === 'ArrowUp'
                  ? 1
                  : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                    ? -1
                    : 0;
              if (direction === 0) return;
              event.preventDefault();
              const next = snapTick(tickMs + direction * TICK_STEP_MS);
              setLocalTickMs(next);
              onTickMsChange?.(next);
            }}
            aria-label="Tick length in milliseconds"
          />
          <span className={styles.speedValue}>{formatTick(tickMs)}</span>
        </label>
      </AnimatedGrid>
    </div>
  );
  const activityMessage =
    failedCore !== undefined ? (
      <span role="alert" className={styles.error}>
        <strong>{nameOf(failedCore.id)} stopped.</strong> {failedCore.error}
      </span>
    ) : transfers.length > 0 ? (
      transfers.map((event, index) => (
        <span key={index}>
          <strong>{nameOf(event.core)}</strong> queued <code>{event.job}</code>{' '}
          on <strong>{nameOf(event.target)}</strong>
        </span>
      ))
    ) : (
      <span>
        {alwaysOn || codeOpen
          ? null
          : 'Compare the threads and press the app button to try it.'}
      </span>
    );
  const viewControls = (
    <div className={styles.viewControls}>
      {collapsibleCode && (
        <button
          type="button"
          className={styles.codeToggle}
          onClick={() => setCodeOpen(!codeOpen)}
          aria-expanded={codeOpen}>
          {codeOpen ? 'Hide code' : 'Show code'}
        </button>
      )}
      <button
        ref={buttonRef}
        type="button"
        className={clsx(styles.codeToggle, styles.expandToggle)}
        onClick={() => setFullscreen(!fullscreen)}
        aria-pressed={fullscreen}
        title={
          fullscreen
            ? 'Collapse simulation (Esc)'
            : 'Expand to fit the simulation'
        }>
        <TransportIcon name={fullscreen ? 'collapse' : 'expand'} />
        <span className={styles.expandLabel}>
          {fullscreen ? 'Collapse' : 'Expand'}
        </span>
      </button>
    </div>
  );
  const activity = (
    <div
      className={styles.activity}
      data-sim-obstacle
      aria-label="Current scheduling activity">
      {activityMessage}
      {viewControls}
    </div>
  );
  const toggleOpen = () => {
    if (open) {
      simulation.pause();
      setFullscreen(false);
    }
    setHasOpened(true);
    setOpen(!open);
  };
  const chevron = (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
  const disclosureToggle = (
    <button
      type="button"
      className={styles.disclosureToggle}
      data-sim-obstacle
      onClick={toggleOpen}
      aria-label={open ? 'Hide simulation' : 'Show simulation'}
      aria-expanded={open}
      aria-controls={disclosureId}>
      <span className={styles.disclosureLabel}>
        <strong>Simulation</strong>
        <span>Follow this code across threads and runtimes</span>
      </span>
      <span className={styles.disclosureAction}>
        {open ? 'Hide' : 'Show'}
        {chevron}
      </span>
    </button>
  );
  const simulationBar = (
    <div className={styles.simulationBar} data-sim-obstacle>
      <div
        className={styles.barActivity}
        aria-label="Current scheduling activity">
        {activityMessage}
      </div>
      <div className={styles.barRow}>
        {toolbar}
        {viewControls}
        <button
          type="button"
          className={clsx(styles.codeToggle, styles.hideToggle)}
          onClick={toggleOpen}
          aria-label="Hide simulation"
          aria-expanded
          aria-controls={disclosureId}>
          Hide
          {chevron}
        </button>
      </div>
    </div>
  );
  const machine = (
    <div className={styles.machineArea}>
      <AnimatedGrid
        animateResize
        className={clsx(
          styles.executionGrid,
          phone && styles.executionWithPhone
        )}>
        <Panel
          title="CPU"
          className={styles.areaThreads}
          help="Put it simply, a thread (a core) executes code and might obtain memory resources (like JavaScript Runtimes) for the duration of the execution.">
          <CpuPanel
            runtimes={runtimes}
            cores={snapshot.cores}
            rawToDisplayLine={simulation.rawToDisplayLine}
            coreCount={coreCount}
          />
          {cpuFooter}
        </Panel>
        {showMemory && (
          <Panel
            title="Memory"
            className={styles.areaMemory}
            help="JavaScript Runtimes and their Event Loops can be thought as exclusive memory resources. Event Loop is usually assigned to one thread and no other thread can obtain it. A Runtime can be obtained by other threads occasionally.">
            <MemoryPanel
              active={open}
              runtimes={everRuntimes.filter(
                (runtime) =>
                  runtime.hasRuntime &&
                  (runtime.kind !== 'ui' || usedRuntimes.has(runtime.id))
              )}
              present={new Set(runtimes.map((runtime) => runtime.id))}
              allRuntimes={runtimes}
              cores={
                showPastDue ? snapshot.cores : withoutPastDue(snapshot.cores)
              }
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
      </AnimatedGrid>
    </div>
  );
  const connections = (
    <Connections
      transitioning={transitioning}
      snapshot={snapshot}
      runtimes={runtimes}
      tick={simulation.tick}
      tickMs={tickMs}
      codeOpen={codeOpen}
      settled={simulation.settled}
      playing={open && simulation.playing}
    />
  );
  const consoleLog = (
    <div
      ref={consoleRef}
      className={styles.console}
      role="region"
      tabIndex={0}
      aria-label="Console output"
      onScroll={(event) => {
        const element = event.currentTarget;
        consoleAtBottomRef.current =
          element.scrollHeight - element.scrollTop - element.clientHeight < 8;
      }}>
      {logs.length === 0 ? (
        <span className={styles.consoleEmpty}>
          Output appears here as the code runs.
        </span>
      ) : (
        logs.map((log, index) => (
          <div
            key={index}
            className={clsx(
              styles.consoleEntry,
              log.level === 'error' && styles.consoleError
            )}>
            <span className={clsx(styles.badge, runtimeClass(log.thread))}>
              {threadName(log.thread)}
            </span>
            {log.runtime !== undefined && (
              <span className={clsx(styles.badge, runtimeClass(log.runtime))}>
                {badgeName(log.runtime.id)} Runtime
              </span>
            )}
            <span className={styles.consoleText}>{log.text}</span>
            <span className={styles.consoleTime}>tick {log.tick}</span>
          </div>
        ))
      )}
    </div>
  );
  const consoleHeader = (
    <header className={styles.panelHeader} data-sim-header>
      <div className={styles.panelTab}>
        <h3 className={styles.panelTitle}>
          Console <span className={styles.logCount}>{logs.length}</span>
        </h3>
      </div>
    </header>
  );
  const consolePanel =
    showConsole &&
    (collapsibleConsole ? (
      <section className={styles.consolePanel} data-sim-obstacle hidden={!open}>
        <div className={styles.panelInner}>
          {consoleHeader}
          <details
            className={styles.consoleBox}
            data-sim-panel-body
            open={consoleOpen}
            onToggle={(event) => setConsoleOpen(event.currentTarget.open)}>
            <summary className={styles.consoleSummary}>
              <span className={styles.consolePreview}>
                {logs.at(-1)?.text ?? 'No output yet'}
              </span>
            </summary>
            {consoleOpen && consoleLog}
          </details>
        </div>
      </section>
    ) : (
      <section className={styles.consolePanel} data-sim-obstacle hidden={!open}>
        <div className={styles.panelInner}>
          {consoleHeader}
          <div className={styles.consoleBox} data-sim-panel-body>
            {consoleLog}
          </div>
        </div>
      </section>
    ));

  return (
    <div
      ref={containerRef}
      data-figure="ThreadingSimulation"
      className={clsx(styles.container, phone && styles.containerWithPhone)}
      data-simulation-fullscreen={expanded && open}>
      {!alwaysOn && open && (
        <PanelHelp
          title="About this simulation"
          label="About this simulation"
          className={clsx(styles.panelHelp, styles.simulationInfo)}>
          {`${SIMULATION_INFO} ${IDLE_TICKS_INFO} ${skipIdleTicks ? SKIPS_IDLE_TICKS : SHOWS_IDLE_TICKS}`}
        </PanelHelp>
      )}
      {title !== undefined && <p className={styles.title}>{title}</p>}
      <div className={styles.scene}>
        <div className={styles.sceneContent} data-sim-content>
          {alwaysOn ? (
            <>
              {toolbar}
              {activity}
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
              {!(open && expanded) && disclosureToggle}
              <Disclosure open={open} id={disclosureId}>
                <div className={styles.simulationBody}>
                  {!expanded && toolbar}
                  {!expanded && activity}
                  {machine}
                </div>
              </Disclosure>
              {consolePanel}
              {open && expanded && simulationBar}
              {hasOpened && connections}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function withoutPastDue(cores: CoreSnapshot[]): CoreSnapshot[] {
  return cores.map((core) => ({
    ...core,
    pending: core.pending.map((job) => ({ ...job, pastDue: false })),
  }));
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

function collectLogs(snapshots: Snapshot[], tick: number) {
  const runtimes = collectRuntimes(snapshots);
  return collectConsoleEntries(snapshots, tick).flatMap((entry) => {
    const thread = runtimes.find((candidate) => candidate.id === entry.core);
    const runtime = runtimes.find(
      (candidate) => candidate.id === entry.runtime
    );
    return thread === undefined ? [] : [{ ...entry, thread, runtime }];
  });
}

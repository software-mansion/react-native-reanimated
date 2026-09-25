import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { flushSync } from 'react-dom';

import type {
  ScreenState,
  Snapshot,
  SnippetModule,
} from '@site/src/simulation';

import { displaySource, simulate } from '@site/src/simulation';
import CodePanel from './CodePanel';
import type { LineHistory } from './CodePanel';
import CpuPanel, { CORE_COUNT } from './CpuPanel';
import { SIMULATION_CLOSE_EVENT, SIMULATION_OPEN_EVENT } from './events';
import ForkBus from './ForkBus';
import type { BusSlot } from './ForkBus';
import MemoryPanel from './MemoryPanel';
import Panel from './Panel';
import Phone from './Phone';
import { badgeName, runtimeClass } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';
import styles from './styles.module.css';
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
  fitWidth?: boolean;
  cpuFooter?: React.ReactNode;
  bootTicks?: number;
  ghostSource?: string;
}

const DEFAULT_TICK_MS = 1800;
const REVEAL_MS = 480;
const PAGE_GUTTER = 32;

let zoomPropertyRegistered = false;

function registerZoomProperty(): void {
  if (
    zoomPropertyRegistered ||
    typeof CSS === 'undefined' ||
    !CSS.registerProperty
  ) {
    return;
  }
  zoomPropertyRegistered = true;
  try {
    CSS.registerProperty({
      name: '--sim-zoom',
      syntax: '<number>',
      inherits: false,
      initialValue: '1',
    });
  } catch {
    return;
  }
}

function sidebarWidth(hidden: boolean): number {
  if (window.innerWidth < 997) {
    return 0;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    hidden ? '--doc-sidebar-hidden-width' : '--doc-sidebar-width'
  );
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : hidden ? 30 : 300;
}
const REVEAL_EASING = 'cubic-bezier(0.2, 0, 0, 1)';

type Phase = 'idle' | 'measure' | 'opening' | 'closing';

interface BoxSize {
  width: number;
  height: number;
}

interface BoxParts {
  outer: HTMLElement;
  stage: HTMLElement;
  scene: HTMLElement | null;
  code: HTMLElement | null;
}

function animateBox(
  { outer, stage, scene, code }: BoxParts,
  from: BoxSize,
  to: BoxSize,
  onDone: () => void
): void {
  if (
    Math.abs(from.height - to.height) < 1 &&
    Math.abs(from.width - to.width) < 1
  ) {
    onDone();
    return;
  }
  const columns =
    scene === null ? '' : getComputedStyle(scene).gridTemplateColumns;
  outer.style.width = `${from.width}px`;
  outer.style.overflow = 'clip';
  outer.style.overflowClipMargin = '8px';
  stage.style.height = `${from.height}px`;
  stage.style.overflow = 'clip';
  stage.style.overflowClipMargin = '8px';
  if (scene !== null) {
    scene.style.gridTemplateColumns = columns;
    scene.style.overflow = 'clip';
  }
  let frame = 0;
  const followEdge = () => {
    if (scene !== null && code !== null) {
      const style = getComputedStyle(scene);
      const inner =
        scene.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      code.style.justifySelf = 'start';
      code.style.width = `${Math.max(inner, 0)}px`;
    }
    frame = requestAnimationFrame(followEdge);
  };
  followEdge();
  outer.getBoundingClientRect();
  outer.style.transition = `width ${REVEAL_MS}ms ${REVEAL_EASING}`;
  stage.style.transition = `height ${REVEAL_MS}ms ${REVEAL_EASING}`;
  outer.style.width = `${to.width}px`;
  stage.style.height = `${to.height}px`;
  let finished = false;
  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    cancelAnimationFrame(frame);
    flushSync(onDone);
    for (const element of [outer, stage]) {
      element.style.width = '';
      element.style.height = '';
      element.style.overflow = '';
      element.style.overflowClipMargin = '';
      element.style.transition = '';
    }
    if (scene !== null) {
      scene.style.gridTemplateColumns = '';
      scene.style.overflow = '';
    }
    if (code !== null) {
      code.style.justifySelf = '';
      code.style.width = '';
    }
  };
  stage.addEventListener(
    'transitionend',
    (event) => {
      if (event.target === stage) {
        finish();
      }
    },
    { once: true }
  );
  window.setTimeout(finish, REVEAL_MS + 100);
}

function codePanelOf(scene: HTMLElement | null): HTMLElement | null {
  const code = scene?.getElementsByClassName(styles.areaCode)[0];
  return code instanceof HTMLElement ? code : null;
}

function sizeOf(outer: HTMLElement, stage: HTMLElement): BoxSize {
  return { width: outer.offsetWidth, height: stage.offsetHeight };
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
const MIN_PULSE_MS = 64;

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
  fitWidth = true,
  cpuFooter,
  bootTicks = 0,
  ghostSource,
}: ThreadingSimulationProps) {
  const [open, setOpen] = useState(defaultOpen || alwaysOn);
  const [phase, setPhase] = useState<Phase>('idle');
  const simulationId = useId();
  const outerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLButtonElement | null>(null);
  const collapsedSizeRef = useRef<BoxSize | null>(null);
  const [localCodeOpen, setLocalCodeOpen] = useState(!collapsibleCode);
  const [boilerplate, setBoilerplate] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [tip, setTip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const inspectTargetRef = useRef<Element | null>(null);
  const markInspectTarget = (target: Element | null) => {
    if (inspectTargetRef.current === target) {
      return;
    }
    inspectTargetRef.current?.classList.remove(styles.inspectTarget);
    target?.classList.add(styles.inspectTarget);
    inspectTargetRef.current = target;
  };
  const onInspectMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!inspecting || sceneRef.current === null) {
      return;
    }
    const target = (event.target as HTMLElement).closest('[data-help]');
    const text = target?.getAttribute('data-help');
    markInspectTarget(text ? target : null);
    if (!text) {
      setTip(null);
      return;
    }
    const bounds = sceneRef.current.getBoundingClientRect();
    setTip({
      text,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };
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
  const ghost = useMemo(() => {
    if (ghostSource === undefined) {
      return undefined;
    }
    try {
      const display = displaySource(ghostSource, { boilerplate });
      return {
        code: display.text,
        rawToDisplayLine: display.rawToDisplayLine,
        blockEnds: display.blockEnds,
      };
    } catch {
      return undefined;
    }
  }, [ghostSource, boilerplate]);
  const boilerplateButton = boilerplateToggle && (
    <button
      type="button"
      className={styles.boilerplateToggle}
      onClick={() => setBoilerplate((current) => !current)}
      aria-pressed={boilerplate}>
      {boilerplate ? 'Hide boilerplate' : 'See boilerplate'}
    </button>
  );

  const expand = () => {
    if (outerRef.current !== null && stageRef.current !== null) {
      collapsedSizeRef.current = sizeOf(outerRef.current, stageRef.current);
    }
    setOpen(true);
    setPhase('measure');
  };
  const hide = () => {
    simulation.pause();
    if (reducedMotion()) {
      setOpen(false);
      window.dispatchEvent(
        new CustomEvent(SIMULATION_CLOSE_EVENT, { detail: simulationId })
      );
      return;
    }
    setPhase('closing');
  };

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const outer = outerRef.current;
    const parent = outer?.parentElement;
    if (fitWidth || stage === null || outer === null || !parent) {
      return;
    }
    const main = outer.closest('main');
    registerZoomProperty();
    const fit = (animate: boolean) => {
      const outerStyle = getComputedStyle(outer);
      const shownWidth = outerStyle.width;
      const shownMargin = outerStyle.marginLeft;
      const shownZoom = getComputedStyle(stage).getPropertyValue('--sim-zoom');
      outer.style.transition = 'none';
      stage.style.transition = 'none';
      stage.style.setProperty('--sim-zoom', '1');
      outer.style.width = 'max-content';
      outer.style.maxWidth = 'none';
      const natural = outer.offsetWidth;
      outer.style.width = shownWidth;
      outer.style.marginLeft = shownMargin;
      stage.style.setProperty('--sim-zoom', shownZoom || '1');
      outer.getBoundingClientRect();
      if (animate) {
        outer.style.transition = '';
        stage.style.transition = '';
      }
      const column = parent.clientWidth;
      const enhanced = main !== null && main.className.includes('Enhanced');
      const sidebar = sidebarWidth(enhanced);
      const mainLeft = sidebar;
      const mainWidth = document.documentElement.clientWidth - sidebar;
      const roomy = enhanced ? mainWidth - 2 * PAGE_GUTTER : 0;
      const available = Math.max(column, roomy);
      const width = Math.min(natural, available);
      outer.style.width = `${width}px`;
      stage.style.setProperty(
        '--sim-zoom',
        natural > available ? String(available / natural) : '1'
      );
      if (main !== null && width > column) {
        const parentLeft = parent.getBoundingClientRect().left;
        outer.style.marginLeft = `${mainLeft + (mainWidth - width) / 2 - parentLeft}px`;
      } else {
        outer.style.marginLeft = '0px';
      }
      if (!animate) {
        outer.getBoundingClientRect();
        outer.style.transition = '';
        stage.style.transition = '';
      }
    };
    fit(false);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) {
        fit(false);
      }
    });
    let timer = 0;
    const settle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fit(false), 150);
    };
    const resizes = new ResizeObserver(settle);
    resizes.observe(parent);
    const classes =
      main === null
        ? null
        : new MutationObserver(() => {
            fit(true);
          });
    if (main !== null && classes !== null) {
      classes.observe(main, { attributes: true, attributeFilter: ['class'] });
    }
    return () => {
      alive = false;
      window.clearTimeout(timer);
      resizes.disconnect();
      classes?.disconnect();
    };
  }, [fitWidth, open]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const outer = outerRef.current;
    if (stage === null || outer === null) {
      return;
    }
    if (phase === 'measure') {
      const available = outer.parentElement?.clientWidth ?? Infinity;
      outer.style.maxWidth = 'none';
      outer.style.width = 'max-content';
      const natural = outer.offsetWidth;
      outer.style.maxWidth = '';
      outer.style.width = '';
      if (natural > available + 1) {
        window.dispatchEvent(
          new CustomEvent(SIMULATION_OPEN_EVENT, { detail: simulationId })
        );
      }
      if (reducedMotion() || collapsedSizeRef.current === null) {
        setPhase('idle');
        return;
      }
      setPhase('opening');
      animateBox(
        {
          outer,
          stage,
          scene: sceneRef.current,
          code: codePanelOf(sceneRef.current),
        },
        collapsedSizeRef.current,
        sizeOf(outer, stage),
        () => setPhase('idle')
      );
    }
    if (phase === 'closing') {
      const scene = sceneRef.current;
      const code = codePanelOf(scene);
      const bar = barRef.current;
      if (scene === null || code === null) {
        setOpen(false);
        setPhase('idle');
        return;
      }
      const sceneStyle = getComputedStyle(scene);
      const stageGap = parseFloat(getComputedStyle(stage).rowGap) || 0;
      const from = sizeOf(outer, stage);
      const to = {
        width: collapsedSizeRef.current?.width ?? from.width,
        height:
          code.getBoundingClientRect().bottom -
          scene.getBoundingClientRect().top +
          parseFloat(sceneStyle.paddingBottom) +
          (bar === null ? 0 : stageGap + bar.offsetHeight),
      };
      animateBox({ outer, stage, scene, code }, from, to, () => {
        setOpen(false);
        setPhase('idle');
        window.dispatchEvent(
          new CustomEvent(SIMULATION_CLOSE_EVENT, { detail: simulationId })
        );
      });
    }
  }, [phase, simulationId]);
  const logs = collectLogs(simulation.snapshots, simulation.tick - 1);
  const screenKey = JSON.stringify(screen ?? null);
  const expectedLogs = useMemo(() => {
    try {
      const snapshots = simulate(module, source, {
        bundleMode,
        uiRuntime,
        screen: (JSON.parse(screenKey) as ScreenState | null) ?? undefined,
        skipTicks,
        bootTicks,
        durationTicks,
      });
      return collectLogs(snapshots, snapshots.length);
    } catch {
      return [];
    }
  }, [
    module,
    source,
    bundleMode,
    uiRuntime,
    screenKey,
    skipTicks,
    bootTicks,
    durationTicks,
  ]);
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
  const usedRuntimes = collectUsedRuntimes(simulation.snapshots, source);
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
      <div
        className={clsx(styles.container, !fitWidth && styles.containerFull)}
        ref={outerRef}>
        {title !== undefined && <p className={styles.title}>{title}</p>}
        <div className={styles.stage} ref={stageRef}>
          <div className={clsx(styles.scene, styles.sceneCollapsed)}>
            <Panel title="Code" className={styles.areaCode}>
              <CodePanel
                code={simulation.displayText}
                runtimes={[]}
                cores={[]}
                rawToDisplayLine={simulation.rawToDisplayLine}
                blockEnds={simulation.blockEnds}
                history={new Map()}
                settled
                columns={codeColumns}
                ghost={ghost}
              />
              <div className={styles.codeFooter}>{boilerplateButton}</div>
            </Panel>
          </div>
          <button
            type="button"
            className={clsx(styles.toggleBar, styles.toggleBarButton)}
            onClick={expand}
            aria-expanded={false}>
            <span className={styles.expandChevron} aria-hidden="true" />
            See how it works
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(styles.container, !fitWidth && styles.containerFull)}
      ref={outerRef}>
      {title !== undefined && <p className={styles.title}>{title}</p>}
      <div className={styles.stage} ref={stageRef}>
        <div className={styles.body} ref={simulation.containerRef}>
          <div
            ref={sceneRef}
            className={clsx(
              styles.scene,
              phone && styles.sceneWithPhone,
              !showMemory && styles.sceneNoMemory,
              simulation.playing && styles.sceneRunning,
              inspecting && styles.sceneInspect
            )}
            style={
              {
                '--propagation': `${simulation.propagationMs}ms`,
              } as React.CSSProperties
            }
            onMouseMove={onInspectMove}
            onMouseLeave={() => {
              markInspectTarget(null);
              setTip(null);
            }}>
            <button
              type="button"
              className={clsx(
                styles.inspectButton,
                inspecting && styles.inspectButtonActive
              )}
              onClick={() => {
                setInspecting((current) => !current);
                markInspectTarget(null);
                setTip(null);
              }}
              aria-pressed={inspecting}
              aria-label="Explain the simulation elements"
              title="What is this?">
              ?
            </button>
            {inspecting && tip !== null && (
              <div
                className={styles.inspectTip}
                style={{ left: tip.x, top: tip.y }}
                role="tooltip">
                {tip.text}
              </div>
            )}
            <Panel
              title="Code"
              className={styles.areaCode}
              help="The snippet being executed. A highlighted line is executing right now on the thread of that colour; lines fade out over the next three ticks.">
              <div
                className={clsx(
                  styles.codeReveal,
                  codeOpen && styles.codeRevealOpen
                )}
                aria-hidden={!codeOpen}>
                <div className={styles.codeRevealInner}>
                  <CodePanel
                    code={simulation.displayText}
                    runtimes={runtimes}
                    cores={snapshot.cores}
                    rawToDisplayLine={simulation.rawToDisplayLine}
                    blockEnds={simulation.blockEnds}
                    history={history}
                    settled={simulation.settled}
                    columns={codeColumns}
                    ghost={ghost}
                  />
                </div>
              </div>
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
            {showConsole && (
              <div className={styles.sideSizer} aria-hidden="true">
                <div className={styles.sideSizerPanel}>
                  <span className={styles.consoleEmpty}>no output yet</span>
                  {expectedLogs.map((log, index) => (
                    <div key={index} className={styles.consoleEntry}>
                      <span className={styles.badge}>
                        {badgeName(log.runtime.id)}
                      </span>
                      <span>{log.text}</span>
                      <span className={styles.consoleTime}>00:00:00.000</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.areaSide}>
              {showConsole && (
                <Panel
                  title="Console"
                  className={styles.consolePanel}
                  help="console.log output, tagged with the runtime it ran on and the wall-clock time it was shown.">
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
              pulse={simulation.propagationMs >= MIN_PULSE_MS}
            />
            <Panel
              title="CPU"
              className={styles.areaCpu}
              help="The threads. Each thread executes at most one line per tick.">
              <CpuPanel
                runtimes={runtimes}
                cores={snapshot.cores}
                rawToDisplayLine={simulation.rawToDisplayLine}
              />
              {(!alwaysOn || cpuFooter !== undefined) && (
                <div className={styles.cpuFooter}>
                  {!alwaysOn && (
                    <div className={styles.transport}>
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
                        tick {simulation.tick}
                        {Number.isFinite(simulation.lastTick) &&
                          ` / ${simulation.lastTick}`}
                      </span>
                    </div>
                  )}
                  {cpuFooter}
                </div>
              )}
            </Panel>
            {showMemory && (
              <Panel
                title="Memory"
                className={styles.areaMemory}
                help="JavaScript runtimes with their event loops, plus shared memory outside every runtime.">
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
          {!alwaysOn && (
            <button
              type="button"
              ref={barRef}
              className={clsx(styles.toggleBar, styles.toggleBarButton)}
              onClick={hide}
              aria-expanded>
              <span
                className={clsx(styles.expandChevron, styles.collapseChevron)}
                aria-hidden="true"
              />
              Hide simulation
            </button>
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

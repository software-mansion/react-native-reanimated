import { ToolError } from './errors.mts';
import { frameMetrics } from './frames.mts';
import type { FrameBasis } from './frames.mts';
import type { IosSampleMetrics } from './metrics.mts';
import { childText, parseTraceTables } from './xctrace-tables.mts';
import type { TraceElement, TraceRow } from './xctrace-tables.mts';

export interface TraceExports {
  threadState: string;
  frames: string;
  hitches: string;
  thermal: string;
  signposts: string;
}

export interface TracedIosApp {
  pid: number;
  mainThread: number;
  jsThread: number;
  frames: FrameBasis;
  recordingSeconds: number;
}

export interface TraceWindow {
  startNs: number;
  endNs: number;
  seconds: number;
}

export interface AppState {
  batteryLevel: number;
  batteryState: string;
  lowPowerMode: boolean;
  brightness: number;
}

export type IosTraceMetrics = Omit<IosSampleMetrics, 'coldStart'>;

export type IosTraceReading =
  | {
      processLived: true;
      metrics: IosTraceMetrics;
      window: TraceWindow;
      thermalState: number;
      appStates: AppState[];
    }
  | { processLived: false; detail: string };

export const THERMAL_STATES = [
  'Nominal',
  'Fair',
  'Serious',
  'Critical',
] as const;
export const MOUNT_SECTION_NAME = 'RCTPerformMountInstructions';
export const REACT_NATIVE_SUBSYSTEM = 'dev.reactnative.instruments';
export const APP_SUBSYSTEM = 'com.reanimatedbenchmark';
export const STATE_EVENT_NAME = 'State';
const MINIMUM_WINDOW_SHARE = 0.8;
const THREAD_STATE_COLUMNS = [
  'start',
  'duration',
  'thread',
  'state',
  'process',
  'core',
] as const;
const SCHEDULER_STATES: Record<string, SchedulerState> = {
  Running: 'on core',
  Runnable: 'off core',
  Preempted: 'off core',
  Throttled: 'off core',
  Interrupted: 'off core',
  Blocked: 'off core',
  Idle: 'off core',
  Terminated: 'off core',
  Unknown: 'unknown',
};
const CORE_TYPES: Record<string, CoreType> = {
  'E Core': 'efficiency',
  'P Core': 'performance',
  'S Core': 'performance',
};

type SchedulerState = 'on core' | 'off core' | 'unknown';

type CoreType = 'efficiency' | 'performance';

const NANOSECONDS_PER_MS = 1e6;
const NANOSECONDS_PER_SECOND = 1e9;
const STATE_KEYS = [
  'footprint',
  'thermal',
  'batteryLevel',
  'batteryState',
  'lowPower',
  'brightness',
] as const;
const BATTERY_STATES = ['unknown', 'unplugged', 'charging', 'full'];
const STATE_PAIR = /(\S+?)=(\S*)/g;
const INTEGER = /^-?\d+$/;

interface Table {
  schema: string;
  columns: readonly string[];
  rows: TraceRow[];
}

interface Interval {
  start: number;
  end: number;
}

interface ThreadInterval extends Interval {
  thread: number;
  state: string;
  coreType: CoreType | null;
}

type StateEvent = Record<(typeof STATE_KEYS)[number], number> & {
  time: number;
};

export function computeIosTraceMetrics(
  exports: TraceExports,
  app: TracedIosApp
): IosTraceReading {
  const threadState = appTable(
    tableOf(exports.threadState, 'thread-state'),
    app.pid
  );
  checkColumns(threadState, THREAD_STATE_COLUMNS);
  if (threadState.rows.length === 0) {
    throw new ToolError(`The trace has no thread of process ${app.pid}`);
  }
  const intervals = threadState.rows.map((row) =>
    threadInterval(threadState, row)
  );
  if (
    intervals.some(
      ({ thread, state }) => thread === app.mainThread && state === 'Terminated'
    )
  ) {
    return {
      processLived: false,
      detail: `the app process ${app.pid} ended before the end of the trace`,
    };
  }
  const signposts = appTable(
    tableOf(exports.signposts, 'os-signpost'),
    app.pid
  );
  const stateEvents = readStateEvents(signposts);
  const span = measuredThreadsSpan(intervals, app);
  const windowEvents = eventsInSpan(stateEvents, span);
  const window = traceWindow(windowEvents, span, app);
  const windowSeconds = (window.end - window.start) / NANOSECONDS_PER_SECOND;
  const appIntervals = (xml: string, schema: string) =>
    intervalsOf(appTable(tableOf(xml, schema), app.pid));
  const frames = appIntervals(exports.frames, 'hitches-updates').filter(
    ({ start, end }) => start >= window.start && end <= window.end
  );
  const hitchesInWindowNs = appIntervals(exports.hitches, 'hitches')
    .map((hitch) => overlapNs(hitch, window))
    .filter((ns) => ns > 0);
  const metrics: IosTraceMetrics = {
    ...frameMetrics(
      frames.map(({ start, end }) => (end - start) / NANOSECONDS_PER_MS),
      app.frames,
      windowSeconds
    ),
    ...cpuMetrics(intervals, app, window),
    ...hitchMetrics(hitchesInWindowNs, windowSeconds),
    mountBatchCount: windowRows(signposts, 'time', window).rows.filter(
      isMountBatchStart
    ).length,
    ...memoryMetrics(windowEvents),
  };
  checkFiniteMetrics(metrics);
  return {
    processLived: true,
    metrics,
    window: {
      startNs: window.start,
      endNs: window.end,
      seconds: windowSeconds,
    },
    thermalState: highestThermalState(
      tableOf(exports.thermal, 'device-thermal-state-intervals'),
      window,
      stateEvents
    ),
    appStates: stateEvents.map(appState),
  };
}

function tableOf(xml: string, schema: string): Table {
  const tables = parseTraceTables(xml).filter(
    (table) => table.schema === schema
  );
  if (tables.length === 0) {
    throw new ToolError(`The xctrace export has no table ${schema}`);
  }
  return {
    schema,
    columns: tables[0].columns,
    rows: tables.flatMap((table) => table.rows),
  };
}

function appTable(table: Table, pid: number): Table {
  return {
    ...table,
    rows: table.rows.filter((row) => {
      const process = row.process;
      return process !== null && Number(childText(process, 'pid')) === pid;
    }),
  };
}

function checkColumns(table: Table, required: readonly string[]) {
  const missing = required.filter((column) => !table.columns.includes(column));
  if (missing.length > 0) {
    throw new ToolError(
      `The table ${table.schema} has no column ${missing.join(', ')}`
    );
  }
}

function threadInterval(threadState: Table, row: TraceRow): ThreadInterval {
  const thread = row.thread === null ? null : childText(row.thread, 'tid');
  if (thread === null || !INTEGER.test(thread)) {
    throw new ToolError(
      `A row of the table ${threadState.schema} has no thread id`
    );
  }
  const state = row.state?.text ?? '';
  if (!Object.hasOwn(SCHEDULER_STATES, state)) {
    throw new ToolError(
      `The table ${threadState.schema} has the unknown thread state "${state}" (known: ${Object.keys(SCHEDULER_STATES).join(', ')})`
    );
  }
  const interval = rowInterval(threadState, row);
  if (interval.end <= interval.start) {
    throw new ToolError(
      `A row of the table ${threadState.schema} has the duration ${interval.end - interval.start} ns, expected more than 0`
    );
  }
  return {
    ...interval,
    thread: Number(thread),
    state,
    coreType: coreTypeOf(row.core?.attributes.fmt),
  };
}

function readStateEvents(signposts: Table): StateEvent[] {
  return signposts.rows
    .filter(
      (row) =>
        row.subsystem?.text === APP_SUBSYSTEM &&
        row.name?.text === STATE_EVENT_NAME
    )
    .map((row) => stateEvent(signposts, row))
    .sort((left, right) => left.time - right.time);
}

function measuredThreadsSpan(
  intervals: ThreadInterval[],
  app: TracedIosApp
): Interval {
  const [main, js] = (
    [
      ['main thread', app.mainThread],
      ['JS thread', app.jsThread],
    ] as const
  ).map(([role, thread]) => {
    const threadIntervals = intervals.filter(
      (interval) => interval.thread === thread
    );
    if (threadIntervals.length === 0) {
      throw new ToolError(
        `The trace has no row of the ${role} ${thread} of process ${app.pid}`
      );
    }
    return coveredSpans(
      threadIntervals.filter(
        (interval) =>
          !startsAtTraceStart(interval) &&
          SCHEDULER_STATES[interval.state] !== 'unknown'
      )
    );
  });
  const common = commonSpans(main, js);
  if (common.length === 0) {
    throw new ToolError(
      `The scheduler data has no time with a known state of both the main thread ${app.mainThread} and the JS thread ${app.jsThread}`
    );
  }
  return common.reduce((longest, span) =>
    span.end - span.start > longest.end - longest.start ? span : longest
  );
}

function eventsInSpan(stateEvents: StateEvent[], span: Interval): StateEvent[] {
  const inSpan = stateEvents.filter(
    ({ time }) => time >= span.start && time <= span.end
  );
  if (inSpan.length < 2) {
    throw new ToolError(
      `The trace has ${inSpan.length} ${STATE_EVENT_NAME} signposts of the app in the longest time that the scheduler data covers the main thread and the JS thread (${spanText(span)}). The trace window needs 2.`
    );
  }
  return inSpan;
}

function traceWindow(
  stateEvents: StateEvent[],
  span: Interval,
  app: TracedIosApp
): Interval {
  const start = stateEvents[0].time;
  const end = stateEvents[stateEvents.length - 1].time;
  const minimumNs =
    MINIMUM_WINDOW_SHARE * app.recordingSeconds * NANOSECONDS_PER_SECOND;
  if (end - start < minimumNs) {
    throw new ToolError(
      `The trace window of process ${app.pid} is ${(end - start) / NANOSECONDS_PER_SECOND} s long (${start} ns to ${end} ns, in the scheduler data of the measured threads from ${spanText(span)}). It must be at least ${percent(MINIMUM_WINDOW_SHARE)} of the recording of ${app.recordingSeconds} s.`
    );
  }
  return { start, end };
}

// A row that starts at 0 gives the state before the scheduler data starts.
function startsAtTraceStart(interval: Interval): boolean {
  return interval.start === 0;
}

function coveredSpans(intervals: Interval[]): Interval[] {
  const spans: Interval[] = [];
  for (const { start, end } of [...intervals].sort(
    (left, right) => left.start - right.start
  )) {
    const last = spans.at(-1);
    if (last && start <= last.end) {
      last.end = Math.max(last.end, end);
    } else {
      spans.push({ start, end });
    }
  }
  return spans;
}

function commonSpans(first: Interval[], second: Interval[]): Interval[] {
  const common: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < first.length && j < second.length) {
    const start = Math.max(first[i].start, second[j].start);
    const end = Math.min(first[i].end, second[j].end);
    if (start < end) {
      common.push({ start, end });
    }
    if (first[i].end < second[j].end) {
      i++;
    } else {
      j++;
    }
  }
  return common;
}

function spanText(span: Interval): string {
  return `${span.start} ns to ${span.end} ns`;
}

function intervalsOf(table: Table): Interval[] {
  return table.rows.map((row) => rowInterval(table, row));
}

function overlapNs(interval: Interval, window: Interval): number {
  return (
    Math.min(interval.end, window.end) - Math.max(interval.start, window.start)
  );
}

function cpuMetrics(
  intervals: ThreadInterval[],
  app: TracedIosApp,
  window: Interval
) {
  const cpuNs = new Map<number, number>();
  let mainEfficiencyCoreNs = 0;
  let mainCoreTypeKnown = true;
  for (const interval of intervals) {
    const { thread, state, coreType } = interval;
    const inWindow = overlapNs(interval, window);
    if (SCHEDULER_STATES[state] !== 'on core' || inWindow <= 0) {
      continue;
    }
    cpuNs.set(thread, (cpuNs.get(thread) ?? 0) + inWindow);
    if (thread === app.mainThread) {
      mainCoreTypeKnown &&= coreType !== null;
      mainEfficiencyCoreNs += coreType === 'efficiency' ? inWindow : 0;
    }
  }
  const windowSeconds = (window.end - window.start) / NANOSECONDS_PER_SECOND;
  const perSecond = (ns: number) => ns / NANOSECONDS_PER_MS / windowSeconds;
  const mainNs = cpuNs.get(app.mainThread) ?? 0;
  const jsNs = cpuNs.get(app.jsThread) ?? 0;
  const processNs = [...cpuNs.values()].reduce((sum, ns) => sum + ns, 0);
  return {
    uiThreadCpu: perSecond(mainNs),
    jsThreadCpu: perSecond(jsNs),
    otherThreadsCpu: perSecond(processNs - mainNs - jsNs),
    processCpu: perSecond(processNs),
    uiThreadEfficiencyCoreShare:
      mainNs > 0 && mainCoreTypeKnown ? mainEfficiencyCoreNs / mainNs : null,
  };
}

function hitchMetrics(durationsNs: number[], windowSeconds: number) {
  const totalNs = durationsNs.reduce((sum, ns) => sum + ns, 0);
  return {
    hitchCount: durationsNs.length,
    hitchTime: totalNs / NANOSECONDS_PER_MS / windowSeconds,
  };
}

function windowRows(table: Table, column: string, window: Interval): Table {
  return {
    ...table,
    rows: table.rows.filter((row) => {
      const time = integerCell(table, row, column);
      return time >= window.start && time < window.end;
    }),
  };
}

function isMountBatchStart(row: TraceRow): boolean {
  return (
    row.subsystem?.text === REACT_NATIVE_SUBSYSTEM &&
    row['event-type']?.text === 'Begin' &&
    row.message?.children[0]?.text === MOUNT_SECTION_NAME
  );
}

function memoryMetrics(stateEvents: StateEvent[]) {
  const first = stateEvents[0].footprint;
  const last = stateEvents[stateEvents.length - 1].footprint;
  return { memory: last, windowMemoryDelta: last - first };
}

function checkFiniteMetrics(metrics: IosTraceMetrics) {
  const notFinite = Object.entries(metrics).filter(
    ([, value]) => value !== null && !Number.isFinite(value)
  );
  if (notFinite.length > 0) {
    throw new ToolError(
      `The trace gives metrics that are not finite numbers: ${notFinite.map(([name, value]) => `${name} = ${value}`).join(', ')}`
    );
  }
}

function highestThermalState(
  thermal: Table,
  window: Interval,
  stateEvents: StateEvent[]
): number {
  const fromIntervals = thermal.rows
    .filter((row) => {
      const { start, end } = rowInterval(thermal, row);
      return start < window.end && end > window.start;
    })
    .map((row) => thermalStateIndex(row['thermal-state']?.text ?? null));
  return Math.max(
    ...fromIntervals,
    ...stateEvents.map((event) => event.thermal)
  );
}

function appState(event: StateEvent): AppState {
  const batteryState = BATTERY_STATES[event.batteryState];
  if (batteryState === undefined) {
    throw new ToolError(
      `The ${STATE_EVENT_NAME} signpost has the unknown batteryState ${event.batteryState}`
    );
  }
  return {
    batteryLevel: event.batteryLevel,
    batteryState,
    lowPowerMode: event.lowPower === 1,
    brightness: event.brightness,
  };
}

function stateEvent(signposts: Table, row: TraceRow): StateEvent {
  const message = messageText(row.message);
  const values = new Map(
    Array.from(message.matchAll(STATE_PAIR), ([, key, value]) => [key, value])
  );
  const event = { time: integerCell(signposts, row, 'time') } as StateEvent;
  for (const key of STATE_KEYS) {
    const value = values.get(key);
    if (value === undefined || !INTEGER.test(value)) {
      throw new ToolError(
        `The ${STATE_EVENT_NAME} signpost "${message}" has no integer value of ${key}`
      );
    }
    event[key] = Number(value);
  }
  return event;
}

function messageText(message: TraceElement | null): string {
  return message?.children.map((part) => part.text).join('') ?? '';
}

function thermalStateIndex(text: string | null): number {
  const index = THERMAL_STATES.findIndex((state) => state === text);
  if (index === -1) {
    throw new ToolError(
      `The thermal state "${text}" is not one of ${THERMAL_STATES.join(', ')}`
    );
  }
  return index;
}

function coreTypeOf(label: string | undefined): CoreType | null {
  const type = Object.keys(CORE_TYPES).find((name) => label?.includes(name));
  return type === undefined ? null : CORE_TYPES[type];
}

function percent(share: number): string {
  return `${share * 100}%`;
}

function rowInterval(table: Table, row: TraceRow): Interval {
  const start = integerCell(table, row, 'start');
  return { start, end: start + integerCell(table, row, 'duration') };
}

function integerCell(table: Table, row: TraceRow, column: string): number {
  const text = row[column]?.text;
  const value = Number(text);
  if (
    text === undefined ||
    !INTEGER.test(text) ||
    !Number.isSafeInteger(value)
  ) {
    throw new ToolError(
      `A row of the table ${table.schema} has no integer in the cell ${column}`
    );
  }
  return value;
}

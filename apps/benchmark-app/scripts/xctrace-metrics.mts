import { ToolError } from './errors.mts';
import type { IosSampleMetrics } from './metrics.mts';
import { quantile } from './statistics.mts';
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
  refreshRate: number;
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
export const EFFICIENCY_CORE_LABEL = 'E Core';

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
  rows: TraceRow[];
}

interface Interval {
  start: number;
  end: number;
}

interface ThreadInterval extends Interval {
  thread: number;
  state: string | null;
  row: TraceRow;
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
  checkThreadRows(intervals, app);
  const signposts = appTable(
    tableOf(exports.signposts, 'os-signpost'),
    app.pid
  );
  const stateEvents = readStateEvents(signposts);
  const window = traceWindow(stateEvents, app.pid);
  checkSchedulerCoverage(intervals, window);
  const windowSeconds = (window.end - window.start) / NANOSECONDS_PER_SECOND;
  const expectedFrameCount = app.refreshRate * windowSeconds;
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
      expectedFrameCount
    ),
    ...cpuMetrics(intervals, app, window),
    ...hitchMetrics(hitchesInWindowNs, windowSeconds),
    mountBatchCount: windowRows(signposts, 'time', window).rows.filter(
      isMountBatchStart
    ).length,
    ...memoryMetrics(stateEvents),
    expectedFrameCount,
  };
  checkFiniteMetrics(metrics);
  return {
    processLived: true,
    metrics,
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
  return { schema, rows: tables.flatMap((table) => table.rows) };
}

function appTable(table: Table, pid: number): Table {
  return {
    schema: table.schema,
    rows: table.rows.filter((row) => {
      const process = row.process;
      return process !== null && Number(childText(process, 'pid')) === pid;
    }),
  };
}

function threadInterval(threadState: Table, row: TraceRow): ThreadInterval {
  const thread = row.thread === null ? null : childText(row.thread, 'tid');
  if (thread === null) {
    throw new ToolError(
      `A row of the table ${threadState.schema} has no thread id`
    );
  }
  return {
    ...rowInterval(threadState, row),
    thread: Number(thread),
    state: row.state?.text ?? null,
    row,
  };
}

function checkThreadRows(intervals: ThreadInterval[], app: TracedIosApp) {
  for (const [role, thread] of [
    ['main thread', app.mainThread],
    ['JS thread', app.jsThread],
  ] as const) {
    if (!intervals.some((interval) => interval.thread === thread)) {
      throw new ToolError(
        `The trace has no row of the ${role} ${thread} of process ${app.pid}`
      );
    }
  }
}

function readStateEvents(signposts: Table): StateEvent[] {
  const events = signposts.rows
    .filter(
      (row) =>
        row.subsystem?.text === APP_SUBSYSTEM &&
        row.name?.text === STATE_EVENT_NAME
    )
    .map((row) => stateEvent(signposts, row))
    .sort((left, right) => left.time - right.time);
  if (events.length < 2) {
    throw new ToolError(
      `The trace has ${events.length} ${STATE_EVENT_NAME} signposts of the app, the trace window needs 2`
    );
  }
  return events;
}

function traceWindow(stateEvents: StateEvent[], pid: number): Interval {
  const start = stateEvents[0].time;
  const end = stateEvents[stateEvents.length - 1].time;
  const length = end - start;
  if (length <= 0) {
    throw new ToolError(
      `The trace window of process ${pid} is ${length} ns long, expected more than 0`
    );
  }
  return { start, end };
}

function checkSchedulerCoverage(intervals: ThreadInterval[], window: Interval) {
  const coverageStart = intervals.reduce(
    (earliest, { start }) => (start > 0 ? Math.min(earliest, start) : earliest),
    Number.POSITIVE_INFINITY
  );
  const coverageEnd = intervals.reduce(
    (latest, { end }) => Math.max(latest, end),
    Number.NEGATIVE_INFINITY
  );
  if (coverageStart > window.start || coverageEnd < window.end) {
    throw new ToolError(
      `The scheduler data of the trace (${coverageStart} ns to ${coverageEnd} ns) does not cover the trace window (${window.start} ns to ${window.end} ns)`
    );
  }
}

function intervalsOf(table: Table): Interval[] {
  return table.rows.map((row) => rowInterval(table, row));
}

function overlapNs(interval: Interval, window: Interval): number {
  return (
    Math.min(interval.end, window.end) - Math.max(interval.start, window.start)
  );
}

function frameMetrics(durations: number[], expectedFrameCount: number) {
  return {
    frameDurationMedian: quantileOrNull(durations, 0.5),
    frameDurationP90: quantileOrNull(durations, 0.9),
    frameDurationP95: quantileOrNull(durations, 0.95),
    frameDurationP99: quantileOrNull(durations, 0.99),
    jankyFrames: Math.max(0, 1 - durations.length / expectedFrameCount),
    frameCount: durations.length,
  };
}

function cpuMetrics(
  intervals: ThreadInterval[],
  app: TracedIosApp,
  window: Interval
) {
  const cpuNs = new Map<number, number>();
  let mainEfficiencyCoreNs = 0;
  for (const interval of intervals) {
    const { thread, state, row } = interval;
    if (state !== 'Running') {
      continue;
    }
    const inWindow = overlapNs(interval, window);
    if (inWindow <= 0) {
      continue;
    }
    cpuNs.set(thread, (cpuNs.get(thread) ?? 0) + inWindow);
    if (
      thread === app.mainThread &&
      row.core?.attributes.fmt?.includes(EFFICIENCY_CORE_LABEL)
    ) {
      mainEfficiencyCoreNs += inWindow;
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
      mainNs > 0 ? mainEfficiencyCoreNs / mainNs : null,
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
    schema: table.schema,
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
      return start <= window.end && end >= window.start;
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

function quantileOrNull(values: number[], q: number): number | null {
  return values.length > 0 ? quantile(values, q) : null;
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

import { ToolError } from './errors.mts';
import type { CpuCounter, TimeSpan } from './in-app-sample.mts';
import { childText, parseTraceTables } from './xctrace-tables.mts';
import type { TraceElement, TraceRow } from './xctrace-tables.mts';

export interface TraceExports {
  threadState: string;
  frames: string;
  signposts: string;
  processes: string;
}

export interface TracedIosApp {
  pid: number;
  mainThread: number;
  jsThread: number;
}

export interface TraceEpochSpans {
  window: TimeSpan;
  counters: Record<CpuCounter, TimeSpan>;
}

export interface FootprintSample extends TimeSpan {
  footprintKb: number;
}

export interface TraceEpoch {
  uiThreadCpu: number;
  jsThreadCpu: number;
  processCpu: number;
  frameDurationsMs: number[];
  mountBatchCount: number;
}

type SchedulerState = 'on core' | 'off core' | 'unknown';

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
}

const MOUNT_SECTION_NAME = 'RCTPerformMountInstructions';

const REACT_NATIVE_SUBSYSTEM = 'dev.reactnative.instruments';

const APP_SUBSYSTEM = 'com.reanimatedbenchmark';

const BOUNDARY_EVENT_NAME = 'Boundary';

const BOUNDARY_MESSAGE = /^index=(\d+)$/;

const THREAD_STATE_COLUMNS = [
  'start',
  'duration',
  'thread',
  'state',
  'process',
] as const;

const FRAME_COLUMNS = ['start', 'duration', 'process'] as const;

const PROCESS_COLUMNS = [
  'start',
  'duration',
  'process',
  'memory-physical-footprint',
] as const;

const BYTES_PER_KB = 1024;

const SIGNPOST_COLUMNS = [
  'time',
  'process',
  'event-type',
  'name',
  'subsystem',
  'message',
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

const NANOSECONDS_PER_MS = 1e6;

const NANOSECONDS_PER_SECOND = 1e9;

const INTEGER = /^-?\d+$/;

export function readBoundarySignposts(
  exports: Pick<TraceExports, 'signposts'>,
  pid: number
): number[] {
  const signposts = appTable(
    tableOf(exports.signposts, 'os-signpost'),
    pid,
    SIGNPOST_COLUMNS
  );
  const times = new Map<number, number>();
  for (const row of signposts.rows) {
    if (
      row.subsystem?.text !== APP_SUBSYSTEM ||
      row.name?.text !== BOUNDARY_EVENT_NAME
    ) {
      continue;
    }
    const message = messageText(row.message);
    const index = BOUNDARY_MESSAGE.exec(message)?.[1];
    if (index === undefined || times.has(Number(index))) {
      throw new ToolError(
        `The ${BOUNDARY_EVENT_NAME} signpost "${message}" has no new index`
      );
    }
    times.set(Number(index), integerCell(signposts, row, 'time'));
  }
  const ordered = Array.from({ length: times.size }, (_, i) => times.get(i));
  if (ordered.some((time) => time === undefined)) {
    throw new ToolError(
      `The ${BOUNDARY_EVENT_NAME} signposts of process ${pid} do not have the indexes 0 to ${times.size - 1}`
    );
  }
  return ordered as number[];
}

export function readFootprints(
  exports: Pick<TraceExports, 'processes'>,
  pid: number
): FootprintSample[] {
  const processes = appTable(
    tableOf(exports.processes, 'activity-monitor-process-live'),
    pid,
    PROCESS_COLUMNS
  );
  return processes.rows.map((row) => {
    const { start, end } = rowInterval(processes, row);
    return {
      startNs: start,
      endNs: end,
      footprintKb:
        integerCell(processes, row, 'memory-physical-footprint') / BYTES_PER_KB,
    };
  });
}

export function readTraceEpochs(
  exports: Omit<TraceExports, 'processes'>,
  app: TracedIosApp,
  spans: readonly TraceEpochSpans[]
): TraceEpoch[] {
  const threadState = appTable(
    tableOf(exports.threadState, 'thread-state'),
    app.pid,
    THREAD_STATE_COLUMNS
  );
  const intervals = threadState.rows.map((row) =>
    threadInterval(threadState, row)
  );
  const covered = measuredThreadsSpans(intervals, app);
  const frames = intervalsOf(
    appTable(tableOf(exports.frames, 'hitches-updates'), app.pid, FRAME_COLUMNS)
  );
  const signposts = appTable(
    tableOf(exports.signposts, 'os-signpost'),
    app.pid,
    SIGNPOST_COLUMNS
  );
  const mountStarts = signposts.rows
    .filter(isMountBatchStart)
    .map((row) => integerCell(signposts, row, 'time'));
  return spans.map((span, index) => {
    const all = [span.window, ...Object.values(span.counters)];
    const startNs = Math.min(...all.map((each) => each.startNs));
    const endNs = Math.max(...all.map((each) => each.endNs));
    if (!covered.some(({ start, end }) => start <= startNs && end >= endNs)) {
      throw new ToolError(
        `The scheduler data does not cover epoch ${index} (${startNs} ns to ${endNs} ns) for both the main thread ${app.mainThread} and the JS thread ${app.jsThread}`
      );
    }
    return traceEpoch(intervals, frames, mountStarts, app, span);
  });
}

function traceEpoch(
  intervals: ThreadInterval[],
  frames: Interval[],
  mountStarts: number[],
  app: TracedIosApp,
  spans: TraceEpochSpans
): TraceEpoch {
  const window = { start: spans.window.startNs, end: spans.window.endNs };
  const runningPerSecond = (
    span: TimeSpan,
    counts: (interval: ThreadInterval) => boolean
  ) => {
    const clip = { start: span.startNs, end: span.endNs };
    const runningNs = intervals
      .filter(
        (interval) =>
          counts(interval) && SCHEDULER_STATES[interval.state] === 'on core'
      )
      .reduce(
        (sum, interval) => sum + Math.max(0, overlapNs(interval, clip)),
        0
      );
    return (
      runningNs /
      NANOSECONDS_PER_MS /
      ((clip.end - clip.start) / NANOSECONDS_PER_SECOND)
    );
  };
  return {
    uiThreadCpu: runningPerSecond(
      spans.counters.uiThread,
      (interval) => interval.thread === app.mainThread
    ),
    jsThreadCpu: runningPerSecond(
      spans.counters.jsThread,
      (interval) => interval.thread === app.jsThread
    ),
    processCpu: runningPerSecond(spans.counters.process, () => true),
    frameDurationsMs: frames
      .filter(({ start, end }) => start >= window.start && end <= window.end)
      .map(({ start, end }) => (end - start) / NANOSECONDS_PER_MS),
    mountBatchCount: mountStarts.filter(
      (time) => time >= window.start && time < window.end
    ).length,
  };
}

function appTable(
  table: Table,
  pid: number,
  requiredColumns: readonly string[]
): Table {
  checkColumns(table, requiredColumns);
  return {
    ...table,
    rows: table.rows.filter((row) => {
      const process = row.process;
      return process !== null && Number(childText(process, 'pid')) === pid;
    }),
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
  return { ...interval, thread: Number(thread), state };
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

function messageText(message: TraceElement | null): string {
  return message?.children.map((part) => part.text).join('') ?? '';
}

function measuredThreadsSpans(
  intervals: ThreadInterval[],
  app: TracedIosApp
): Interval[] {
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
  return commonSpans(main, js);
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

// A row that starts at 0 gives the state before the scheduler data starts.
function startsAtTraceStart(interval: Interval): boolean {
  return interval.start === 0;
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

function intervalsOf(table: Table): Interval[] {
  return table.rows.map((row) => rowInterval(table, row));
}

function overlapNs(interval: Interval, window: Interval): number {
  return (
    Math.min(interval.end, window.end) - Math.max(interval.start, window.start)
  );
}

function isMountBatchStart(row: TraceRow): boolean {
  return (
    row.subsystem?.text === REACT_NATIVE_SUBSYSTEM &&
    row['event-type']?.text === 'Begin' &&
    row.message?.children[0]?.text === MOUNT_SECTION_NAME
  );
}

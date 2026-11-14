import { ToolError } from './errors.mts';
import { frameMetrics, quantileOrNull } from './frames.mts';
import type { FrameBasis } from './frames.mts';
import { RECORDING_SECONDS } from './measurement-rules.mts';
import type { AndroidSampleMetrics } from './metrics.mts';
import type { Processes } from './processes.mts';

export type TraceMetrics = Omit<AndroidSampleMetrics, 'coldStart'>;

export interface TracedApp {
  applicationId: string;
  pid: number;
  jsThread: number;
}

export type TraceReading =
  | { processLived: true; metrics: TraceMetrics }
  | { processLived: false; detail: string };

export interface ResultSet {
  columns: string[];
  rows: (string | null)[][];
}

export const JS_THREAD_NAME = 'mqt_v_js';
export const RENDER_THREAD_NAME = 'RenderThread';
export const FRAME_SLICE_PATTERN = 'Choreographer#doFrame%';
export const DRAW_FRAME_SLICE_PATTERN = 'DrawFrame%';
export const MOUNT_BATCH_SLICE_NAME = 'IntBufferBatchMountItem::mountViews';
export const APP_DEADLINE_MISSED = 'App Deadline Missed';
export const CPU_FREQUENCY_POLL_MS = 1000;
export const TRACE_PROCESSOR_TIMEOUT_MS = 5 * 60_000;

const APPLICATION_ID_PATTERN =
  /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;
const NANOSECONDS_PER_MS = 1e6;
const MILLICYCLES_PER_MHZ_MS = 1e6;
const BYTES_PER_KB = 1024;
const THREAD_ROLES = ['main', 'js', 'render', 'other'];

export class TraceProcessor {
  readonly #processes: Processes;
  readonly #binary: string;

  constructor(processes: Processes, binary: string) {
    this.#processes = processes;
    this.#binary = binary;
  }

  async collect(
    tracePath: string,
    app: TracedApp,
    frames: FrameBasis
  ): Promise<TraceReading> {
    const { stdout } = await this.#processes.run(
      this.#binary,
      [
        'query',
        '--no-agent',
        '--format',
        'csv',
        '--quiet',
        '-f',
        '-',
        tracePath,
      ],
      { input: metricsQuery(app), timeoutMs: TRACE_PROCESSOR_TIMEOUT_MS }
    );
    return computeTraceMetrics(parseQueryOutput(stdout), app, frames);
  }
}

export function traceConfig(
  applicationId: string,
  durationMs = RECORDING_SECONDS * 1000
): string {
  checkApplicationId(applicationId);
  return `buffers {
  size_kb: 131072
  fill_policy: DISCARD
}
buffers {
  size_kb: 16384
  fill_policy: DISCARD
}
data_sources {
  config {
    name: "android.surfaceflinger.frametimeline"
    target_buffer: 1
  }
}
data_sources {
  config {
    name: "linux.process_stats"
    target_buffer: 1
    process_stats_config {
      scan_all_processes_on_start: true
      proc_stats_poll_ms: 1000
    }
  }
}
data_sources {
  config {
    name: "linux.sys_stats"
    target_buffer: 1
    sys_stats_config {
      cpufreq_period_ms: ${CPU_FREQUENCY_POLL_MS}
    }
  }
}
data_sources {
  config {
    name: "linux.ftrace"
    target_buffer: 0
    ftrace_config {
      buffer_size_kb: 16384
      drain_period_ms: 250
      ftrace_events: "sched/sched_switch"
      ftrace_events: "sched/sched_waking"
      ftrace_events: "sched/sched_process_free"
      ftrace_events: "task/task_newtask"
      ftrace_events: "task/task_rename"
      ftrace_events: "power/cpu_frequency"
      atrace_categories: "gfx"
      atrace_categories: "view"
      atrace_apps: "${applicationId}"
    }
  }
}
duration_ms: ${durationMs}
`;
}

export function metricsQuery(app: TracedApp): string {
  checkApplicationId(app.applicationId);
  checkId(app.pid, 'process id');
  checkId(app.jsThread, 'thread id');
  const traceWindow = `trace_window AS (
    SELECT
      MAX(start_ts, COALESCE((SELECT int_value FROM metadata WHERE name = 'all_data_source_started_ns'), start_ts)) AS start_ts,
      end_ts
    FROM trace_bounds
  )`;
  const appProcess = `app AS (
    SELECT upid, pid, end_ts FROM process
    WHERE pid = ${app.pid} AND name = '${app.applicationId}'
  )`;
  const appThreads = `app_thread AS (
    SELECT
      thread.utid,
      thread.name,
      CASE
        WHEN thread.tid = app.pid THEN 'main'
        WHEN thread.tid = ${app.jsThread} THEN 'js'
        WHEN thread.name = '${RENDER_THREAD_NAME}' THEN 'render'
        ELSE 'other'
      END AS role
    FROM thread JOIN app USING (upid)
  )`;
  const threadSlices = `thread_slice AS (
    SELECT slice.ts, slice.dur, slice.name, thread.tid = app.pid AS is_main, thread.name AS thread_name
    FROM slice
    JOIN thread_track ON slice.track_id = thread_track.id
    JOIN thread USING (utid)
    JOIN app USING (upid)
    JOIN trace_window
    WHERE slice.dur > 0
      AND slice.ts >= trace_window.start_ts
      AND slice.ts < trace_window.end_ts
  )`;
  return `INCLUDE PERFETTO MODULE linux.cpu.utilization.thread;
WITH
  ${traceWindow},
  ${appProcess},
  ${appThreads}
SELECT
  (SELECT end_ts - start_ts FROM trace_window) AS window_ns,
  (SELECT COUNT(*) FROM app) AS app_processes,
  (SELECT COUNT(*) FROM app JOIN trace_window WHERE app.end_ts < trace_window.end_ts) AS ended_processes,
  (SELECT COUNT(*) FROM app_thread WHERE role = 'js' AND name = '${JS_THREAD_NAME}') AS js_threads,
  (
    SELECT COUNT(*) FROM slice JOIN thread_track ON slice.track_id = thread_track.id
    WHERE slice.name LIKE '${FRAME_SLICE_PATTERN}'
  ) AS trace_frame_slices;
WITH
  ${traceWindow},
  ${appProcess},
  ${appThreads}
SELECT
  app_thread.role,
  SUM(
    IIF(sched.dur = -1, trace_window.end_ts, MIN(sched.ts + sched.dur, trace_window.end_ts))
      - MAX(sched.ts, trace_window.start_ts)
  ) AS cpu_ns
FROM app_thread
JOIN sched USING (utid)
JOIN trace_window
WHERE sched.dur != 0
  AND sched.ts < trace_window.end_ts
  AND (sched.dur = -1 OR sched.ts + sched.dur > trace_window.start_ts)
GROUP BY app_thread.utid;
WITH
  ${traceWindow},
  ${appProcess},
  ${appThreads}
SELECT app_thread.role, cycles.millicycles
FROM cpu_cycles_per_thread_in_interval(
  (SELECT start_ts FROM trace_window),
  (SELECT end_ts - start_ts FROM trace_window)
) AS cycles
JOIN app_thread USING (utid);
WITH
  ${traceWindow},
  ${appProcess}
SELECT
  dur,
  COALESCE(jank_type, 'None') != 'None' AS jank_flagged,
  COALESCE(jank_type, '') LIKE '%${APP_DEADLINE_MISSED}%' AS app_deadline_missed
FROM actual_frame_timeline_slice JOIN trace_window
WHERE upid IN (SELECT upid FROM app)
  AND dur > 0
  AND ts >= trace_window.start_ts
  AND ts < trace_window.end_ts
ORDER BY ts;
WITH
  ${traceWindow},
  ${appProcess},
  ${threadSlices}
SELECT dur FROM thread_slice
WHERE is_main AND name LIKE '${FRAME_SLICE_PATTERN}'
ORDER BY ts;
WITH
  ${traceWindow},
  ${appProcess},
  ${threadSlices}
SELECT dur FROM thread_slice
WHERE thread_name = '${RENDER_THREAD_NAME}' AND name LIKE '${DRAW_FRAME_SLICE_PATTERN}'
ORDER BY ts;
WITH
  ${traceWindow},
  ${appProcess},
  ${threadSlices}
SELECT COUNT(*) AS mount_batches FROM thread_slice
WHERE name = '${MOUNT_BATCH_SLICE_NAME}';
WITH ${appProcess}
SELECT counter.ts, process_counter_track.name = 'mem.swap' AS is_swap, counter.value
FROM counter
JOIN process_counter_track ON counter.track_id = process_counter_track.id
WHERE process_counter_track.upid IN (SELECT upid FROM app)
  AND process_counter_track.name IN ('mem.rss.anon', 'mem.swap')
ORDER BY counter.ts;
SELECT name, idx, value FROM stats WHERE severity = 'data_loss' AND value > 0;
`;
}

export function parseQueryOutput(output: string): ResultSet[] {
  return output
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const [header, ...lines] = block.split('\n');
      return {
        columns: splitCsvLine(header),
        rows: lines.map((line) =>
          splitCsvLine(line).map((cell) => (cell === '[NULL]' ? null : cell))
        ),
      };
    });
}

export function computeTraceMetrics(
  sets: ResultSet[],
  app: TracedApp,
  frames: FrameBasis
): TraceReading {
  const [
    summarySet,
    threadCpuSet,
    threadWorkSet,
    frameTimelineSet,
    frameSet,
    drawFrameSet,
    mountBatchSet,
    memorySet,
    lossSet,
  ] = sets;
  if (
    !summarySet ||
    !threadCpuSet ||
    !threadWorkSet ||
    !frameTimelineSet ||
    !frameSet ||
    !drawFrameSet ||
    !mountBatchSet ||
    !memorySet ||
    !lossSet
  ) {
    throw new ToolError(
      `trace_processor_shell returned ${sets.length} result sets, expected 9`
    );
  }
  checkNoDataLoss(lossSet);
  const summary = numericRows(summarySet)[0];
  if (summary.app_processes === 0) {
    throw new ToolError(
      `The trace has no process ${app.applicationId} with pid ${app.pid}`
    );
  }
  if (summary.app_processes > 1 || summary.ended_processes > 0) {
    return {
      processLived: false,
      detail: `the app process ${app.pid} ended before the end of the trace`,
    };
  }
  if (summary.js_threads === 0) {
    throw new ToolError(
      `The app process has no thread "${JS_THREAD_NAME}" with the jsThread ${app.jsThread} of the READY line`
    );
  }
  if (summary.trace_frame_slices === 0) {
    throw new ToolError(
      `The trace has no ${FRAME_SLICE_PATTERN} slice on any thread. The atrace category "view" gave no data.`
    );
  }
  const windowSeconds = summary.window_ns / 1e9;
  if (!(windowSeconds > 0)) {
    throw new ToolError(
      `The trace window is ${summary.window_ns} ns long, expected more than 0`
    );
  }
  const metrics = {
    ...frameMetrics(durationsMs(frameSet), frames, windowSeconds),
    ...frameTimelineMetrics(numericRows(frameTimelineSet)),
    ...drawFrameMetrics(durationsMs(drawFrameSet)),
    ...cpuMetrics(threadCpuSet, windowSeconds),
    ...cpuWorkMetrics(threadWorkSet, windowSeconds),
    mountBatchCount: numericRows(mountBatchSet)[0].mount_batches,
    ...memoryMetrics(numericRows(memorySet)),
  };
  checkFiniteMetrics(metrics);
  return { processLived: true, metrics };
}

function checkApplicationId(applicationId: string) {
  if (!APPLICATION_ID_PATTERN.test(applicationId)) {
    throw new ToolError(`"${applicationId}" is not a valid application id`);
  }
}

function checkId(id: number, kind: string) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ToolError(`${id} is not a valid ${kind}`);
  }
}

function splitCsvLine(line: string): string[] {
  return line.split(',').map((cell) => cell.replace(/^"(.*)"$/, '$1'));
}

function checkNoDataLoss(lossSet: ResultSet) {
  if (lossSet.rows.length > 0) {
    const losses = lossSet.rows.map(
      ([name, idx, value]) => `${name}[${idx}] = ${value}`
    );
    throw new ToolError(
      `The trace lost data (stats with severity data_loss): ${losses.join(', ')}. Make the trace buffers larger.`
    );
  }
}

function numericRows(set: ResultSet): Record<string, number>[] {
  return set.rows.map((row) =>
    Object.fromEntries(
      set.columns.map((column, i) => [column, Number(row[i] ?? Number.NaN)])
    )
  );
}

function durationsMs(set: ResultSet): number[] {
  return numericRows(set).map((row) => row.dur / NANOSECONDS_PER_MS);
}

function frameTimelineMetrics(frames: Record<string, number>[]) {
  const durations = frames.map((frame) => frame.dur / NANOSECONDS_PER_MS);
  const share = (flag: string) =>
    frames.length > 0
      ? frames.filter((frame) => frame[flag] === 1).length / frames.length
      : null;
  return {
    frameTimelineDurationMedian: quantileOrNull(durations, 0.5),
    frameTimelineDurationP95: quantileOrNull(durations, 0.95),
    frameTimelineFrameCount: frames.length,
    jankFlaggedFrames: share('jank_flagged'),
    appDeadlineMissedFrames: share('app_deadline_missed'),
  };
}

function drawFrameMetrics(durations: number[]) {
  return {
    drawFrameMedian: quantileOrNull(durations, 0.5),
    drawFrameP95: quantileOrNull(durations, 0.95),
  };
}

function cpuMetrics(threadCpuSet: ResultSet, windowSeconds: number) {
  const threads = threadCpuSet.rows.map(([role, cpuNs]) => ({
    role,
    cpuNs: Number(cpuNs),
  }));
  const cpuPerSecond = (roles: (string | null)[]) =>
    threads
      .filter((thread) => roles.includes(thread.role))
      .reduce((sum, thread) => sum + thread.cpuNs, 0) /
    NANOSECONDS_PER_MS /
    windowSeconds;
  return {
    uiThreadCpu: cpuPerSecond(['main']),
    jsThreadCpu: cpuPerSecond(['js']),
    renderThreadCpu: cpuPerSecond(['render']),
    otherThreadsCpu: cpuPerSecond(['other']),
    processCpu: cpuPerSecond(THREAD_ROLES),
  };
}

function cpuWorkMetrics(threadWorkSet: ResultSet, windowSeconds: number) {
  const workPerSecond = (roles: (string | null)[]) => {
    const millicycles = threadWorkSet.rows.flatMap(([role, value]) =>
      roles.includes(role) && value !== null ? [Number(value)] : []
    );
    return millicycles.length > 0
      ? millicycles.reduce((sum, value) => sum + value, 0) /
          MILLICYCLES_PER_MHZ_MS /
          windowSeconds
      : null;
  };
  return {
    uiThreadCpuWork: workPerSecond(['main']),
    processCpuWork: workPerSecond(THREAD_ROLES),
  };
}

function memoryMetrics(samples: Record<string, number>[]) {
  const anon = samples
    .filter((sample) => sample.is_swap === 0)
    .map((sample) => sample.value);
  const swap = samples
    .filter((sample) => sample.is_swap === 1)
    .map((sample) => sample.value);
  if (anon.length === 0) {
    throw new ToolError(
      'The trace has no mem.rss.anon counter of the app process'
    );
  }
  const total = (index: (values: number[]) => number) =>
    (anon[index(anon)] + (swap.length > 0 ? swap[index(swap)] : 0)) /
    BYTES_PER_KB;
  const first = total(() => 0);
  const last = total((values) => values.length - 1);
  return { memory: last, windowMemoryDelta: last - first };
}

function checkFiniteMetrics(metrics: TraceMetrics) {
  const notFinite = Object.entries(metrics).filter(
    ([, value]) => value !== null && !Number.isFinite(value)
  );
  if (notFinite.length > 0) {
    throw new ToolError(
      `The trace gives metrics that are not finite numbers: ${notFinite.map(([name, value]) => `${name} = ${value}`).join(', ')}`
    );
  }
}

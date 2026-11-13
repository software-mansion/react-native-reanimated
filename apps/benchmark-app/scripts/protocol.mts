import fs from 'node:fs';
import path from 'node:path';

import {
  REMOTE_CONFIG_DIR,
  REMOTE_TRACE_DIR,
  REMOTE_TRACE_PREFIX,
} from './android-device.mts';
import type {
  ActivityStart,
  DeviceState,
  DeviceStateGuard,
} from './android-device.mts';
import { ToolError } from './errors.mts';
import type { SampleMetrics } from './metrics.mts';
import { traceConfig } from './perfetto.mts';
import type { TracedApp, TraceReading } from './perfetto.mts';
import { MINIMUM_MOUNT_BATCHES } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';
import type { LineStream } from './tools.mts';

export interface SampleDevice {
  forceStop: (applicationId: string) => Promise<void>;
  readState: () => Promise<DeviceState>;
  readThermalStatus: () => Promise<number>;
  readBatteryTemperature: () => Promise<number>;
  clearLog: () => Promise<void>;
  startActivity: (
    applicationId: string,
    scenario: string,
    load: number | undefined
  ) => Promise<ActivityStart>;
  streamReports: (onLine: (line: string) => void) => LineStream;
  readPid: (applicationId: string) => Promise<number | null>;
  push: (localPath: string, remotePath: string) => Promise<void>;
  recordTrace: (remoteConfig: string, remoteTrace: string) => Promise<void>;
  pull: (remotePath: string, localPath: string) => Promise<void>;
  remove: (remotePath: string) => Promise<void>;
}

export interface Collector {
  collect: (
    tracePath: string,
    app: TracedApp,
    refreshRate: number
  ) => Promise<TraceReading>;
}

export interface Clock {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export const SYSTEM_CLOCK: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export interface SampleRequest {
  applicationId: string;
  stopApplicationIds: string[];
  scenario: Scenario;
  load?: number;
  baselineTemperature: number;
  guard: DeviceStateGuard;
  traceFile: string;
  keepTrace: boolean;
}

export type InvalidCause = 'crash' | 'thermal' | 'frames' | 'work';

export const INVALID_CAUSES: readonly InvalidCause[] = [
  'crash',
  'thermal',
  'frames',
  'work',
];

export const SAMPLE_STEPS = [
  'wait',
  'start',
  'ready',
  'trace',
  'pull',
  'parse',
] as const;

export type SampleStep = (typeof SAMPLE_STEPS)[number];

export interface ScenarioReport {
  version: number;
  load: number;
  jsThread: number | null;
}

interface SampleObservations {
  report?: ScenarioReport;
  pid?: number;
  refreshRate?: number;
  thermalBefore?: number;
  thermalAfter?: number;
  metrics?: SampleMetrics;
  timings: Partial<Record<SampleStep, number>>;
  trace?: string;
}

export type ValidSample = SampleObservations & {
  valid: true;
  metrics: SampleMetrics;
};

export type InvalidSample = SampleObservations & {
  valid: false;
  cause: InvalidCause;
  detail: string;
};

export type SampleResult = ValidSample | InvalidSample;

export type ReportLine =
  | {
      kind: 'ready';
      scenario: string;
      version: number;
      load: number;
      jsThread: number | null;
    }
  | { kind: 'failed'; scenario: string; reason: string };

type ReadyOutcome =
  | { ready: true; report: ScenarioReport }
  | { ready: false; reason: string };

interface SampleSteps {
  timings: SampleResult['timings'];
  timed: <T>(step: SampleStep, action: () => Promise<T>) => Promise<T>;
}

interface RunningApp {
  request: SampleRequest;
  device: SampleDevice;
  collector: Collector;
  clock: Clock;
  steps: SampleSteps;
  watch: ReportWatch;
  coldStart: number;
}

interface TraceFiles {
  localConfig: string;
  remoteConfig: string;
  remoteTrace: string;
}

type Measured = SampleObservations & {
  metrics: SampleMetrics;
  thermalAfter: number;
};

export const MINIMUM_WAIT_MS = 10_000;
export const COOL_DOWN_LIMIT_MS = 600_000;
export const COOL_DOWN_POLL_MS = 5_000;
export const TEMPERATURE_TOLERANCE = 2;
export const READY_TIMEOUT_MS = 60_000;
export const PROCESS_POLL_MS = 1_000;
export const MINIMUM_FRAME_SHARE = 0.9;

export async function takeSample(
  request: SampleRequest,
  device: SampleDevice,
  collector: Collector,
  clock: Clock
): Promise<SampleResult> {
  const steps = timedSteps(clock);
  for (const applicationId of request.stopApplicationIds) {
    await device.forceStop(applicationId);
  }
  await steps.timed('wait', () =>
    waitForCoolDevice(device, clock, request.baselineTemperature)
  );

  await device.clearLog();
  const start = await steps.timed('start', () =>
    device.startActivity(request.applicationId, request.scenario, request.load)
  );
  if (!start.started) {
    await device.forceStop(request.applicationId);
    return {
      valid: false,
      cause: 'crash',
      detail: start.reason,
      timings: steps.timings,
    };
  }
  const watch = new ReportWatch(device, request.scenario);
  try {
    return await measureRunningApp({
      request,
      device,
      collector,
      clock,
      steps,
      watch,
      coldStart: start.totalTime,
    });
  } finally {
    watch.stop();
    await device.forceStop(request.applicationId);
  }
}

export function parseReportLine(line: string): ReportLine | null {
  const text = line.trim();
  const ready =
    /^READY scenario=(\S+) version=(\d+) load=(\d+)(?: jsThread=(\d+))?$/.exec(
      text
    );
  if (ready) {
    return {
      kind: 'ready',
      scenario: ready[1],
      version: Number(ready[2]),
      load: Number(ready[3]),
      jsThread: ready[4] === undefined ? null : Number(ready[4]),
    };
  }
  const failed = /^FAILED scenario=(\S+) reason=(.*)$/.exec(text);
  if (failed) {
    return { kind: 'failed', scenario: failed[1], reason: failed[2] };
  }
  return null;
}

function timedSteps(clock: Clock): SampleSteps {
  const timings: SampleSteps['timings'] = {};
  return {
    timings,
    timed: async (step, action) => {
      const startedAt = clock.now();
      try {
        return await action();
      } finally {
        timings[step] = clock.now() - startedAt;
      }
    },
  };
}

async function waitForCoolDevice(
  device: SampleDevice,
  clock: Clock,
  baselineTemperature: number
) {
  const startedAt = clock.now();
  await clock.sleep(MINIMUM_WAIT_MS);
  while (true) {
    const thermalStatus = await device.readThermalStatus();
    const temperature = await device.readBatteryTemperature();
    if (
      thermalStatus === 0 &&
      Math.abs(temperature - baselineTemperature) <= TEMPERATURE_TOLERANCE
    ) {
      return;
    }
    if (clock.now() - startedAt >= COOL_DOWN_LIMIT_MS) {
      throw new ToolError(
        `The device did not settle in ${COOL_DOWN_LIMIT_MS / 60_000} minutes: thermal status ${thermalStatus}, battery ${temperature} °C, ${baselineTemperature} °C at session start`
      );
    }
    await clock.sleep(COOL_DOWN_POLL_MS);
  }
}

class ReportWatch {
  readonly #scenario: string;
  readonly #stream: LineStream;
  #report: ScenarioReport | null = null;
  #failure: string | null = null;

  constructor(device: SampleDevice, scenario: string) {
    this.#scenario = scenario;
    this.#stream = device.streamReports((line) => this.#read(line));
  }

  readyOutcome(): ReadyOutcome | null {
    const failure = this.checkedFailure();
    if (failure) {
      return { ready: false, reason: failure };
    }
    return this.#report ? { ready: true, report: this.#report } : null;
  }

  checkedFailure(): string | null {
    const streamFailure = this.#stream.failure();
    if (streamFailure) {
      throw streamFailure;
    }
    return this.#failure;
  }

  stop() {
    this.#stream.stop();
  }

  #read(line: string) {
    const report = parseReportLine(line);
    if (report?.kind === 'failed') {
      this.#failure ??= `FAILED scenario=${report.scenario} reason=${report.reason}`;
    } else if (report?.scenario === this.#scenario) {
      this.#report ??= {
        version: report.version,
        load: report.load,
        jsThread: report.jsThread,
      };
    }
  }
}

async function measureRunningApp(app: RunningApp): Promise<SampleResult> {
  const { request, device, watch } = app;
  const { applicationId } = request;
  const { timings, timed } = app.steps;
  const ready = await timed('ready', () =>
    waitForReady(device, app.clock, watch, applicationId)
  );
  if (!ready.ready) {
    return { valid: false, cause: 'crash', detail: ready.reason, timings };
  }
  const { report } = ready;
  const { jsThread } = report;
  if (jsThread === null) {
    throw new ToolError(
      `The READY line of ${applicationId} has no jsThread field. Build the app again from the current benchmark app source.`
    );
  }
  const pid = await device.readPid(applicationId);
  if (pid === null) {
    return {
      valid: false,
      cause: 'crash',
      detail: 'the app process died after READY',
      report,
      timings,
    };
  }

  const before = await device.readState();
  const refreshRate = request.guard.checkInApp(before, 'before the trace');
  const thermalBefore = before.thermalStatus;
  const observed = { report, pid, refreshRate, thermalBefore, timings };
  if (thermalBefore > 0) {
    return {
      valid: false,
      cause: 'thermal',
      detail: `thermal status ${thermalBefore} before the trace`,
      ...observed,
    };
  }

  const files = traceFiles(request.traceFile);
  await timed('trace', async () => {
    await pushConfig(device, traceConfig(applicationId), files);
    await device.recordTrace(files.remoteConfig, files.remoteTrace);
  });
  const ended =
    watch.checkedFailure() ?? (await processEnd(device, applicationId, pid));
  if (ended !== null) {
    await stopAndPull(app, files);
    return tracedCrash(ended, observed, request);
  }
  const after = await device.readState();
  request.guard.checkInApp(after, 'after the trace');
  await stopAndPull(app, files);
  const lateFailure = watch.checkedFailure();
  if (lateFailure !== null) {
    return tracedCrash(lateFailure, observed, request);
  }

  const reading = await timed('parse', () =>
    app.collector.collect(
      request.traceFile,
      { applicationId, pid, jsThread },
      refreshRate
    )
  );
  if (!reading.processLived) {
    return tracedCrash(reading.detail, observed, request);
  }
  return judge(
    {
      ...observed,
      thermalAfter: after.thermalStatus,
      metrics: { ...reading.metrics, coldStart: app.coldStart },
    },
    request
  );
}

async function waitForReady(
  device: SampleDevice,
  clock: Clock,
  watch: ReportWatch,
  applicationId: string
): Promise<ReadyOutcome> {
  const deadline = clock.now() + READY_TIMEOUT_MS;
  while (clock.now() < deadline) {
    await clock.sleep(PROCESS_POLL_MS);
    const outcome = watch.readyOutcome();
    if (outcome) {
      return outcome;
    }
    if ((await device.readPid(applicationId)) === null) {
      return (
        watch.readyOutcome() ?? { ready: false, reason: 'the app process died' }
      );
    }
  }
  return (
    watch.readyOutcome() ?? {
      ready: false,
      reason: `no READY line in ${READY_TIMEOUT_MS / 1000} s`,
    }
  );
}

function traceFiles(traceFile: string): TraceFiles {
  const remoteName = `${REMOTE_TRACE_PREFIX}${path.basename(traceFile)}`;
  return {
    localConfig: `${traceFile}.pbtxt`,
    remoteConfig: `${REMOTE_CONFIG_DIR}/${remoteName}.pbtxt`,
    remoteTrace: `${REMOTE_TRACE_DIR}/${remoteName}`,
  };
}

async function pushConfig(
  device: SampleDevice,
  config: string,
  files: TraceFiles
) {
  fs.writeFileSync(files.localConfig, config);
  try {
    await device.push(files.localConfig, files.remoteConfig);
  } finally {
    fs.rmSync(files.localConfig, { force: true });
  }
}

async function processEnd(
  device: SampleDevice,
  applicationId: string,
  pid: number
): Promise<string | null> {
  const current = await device.readPid(applicationId);
  if (current === pid) {
    return null;
  }
  return current === null
    ? `the app process ${pid} died during the trace`
    : `the app process ${pid} ended during the trace, process ${current} runs now`;
}

async function stopAndPull(app: RunningApp, files: TraceFiles) {
  await app.device.forceStop(app.request.applicationId);
  await app.steps.timed('pull', () =>
    app.device.pull(files.remoteTrace, app.request.traceFile)
  );
  await app.device.remove(files.remoteTrace);
  await app.device.remove(files.remoteConfig);
}

function tracedCrash(
  detail: string,
  observed: SampleObservations,
  request: SampleRequest
): InvalidSample {
  return {
    valid: false,
    cause: 'crash',
    detail,
    trace: request.traceFile,
    ...observed,
  };
}

function judge(measured: Measured, request: SampleRequest): SampleResult {
  const { metrics, thermalAfter } = measured;
  const minimumFrames = MINIMUM_FRAME_SHARE * metrics.expectedFrameCount;
  const minimumMountBatches = MINIMUM_MOUNT_BATCHES[request.scenario] ?? 0;
  if (thermalAfter > 0) {
    return {
      valid: false,
      cause: 'thermal',
      detail: `thermal status ${thermalAfter} after the trace`,
      trace: request.traceFile,
      ...measured,
    };
  }
  if (metrics.frameCount < minimumFrames) {
    return {
      valid: false,
      cause: 'frames',
      detail: `${metrics.frameCount} frames, expected at least ${Math.ceil(minimumFrames)}`,
      trace: request.traceFile,
      ...measured,
    };
  }
  if (metrics.mountBatchCount < minimumMountBatches) {
    return {
      valid: false,
      cause: 'work',
      detail: `${metrics.mountBatchCount} mount batches, expected at least ${minimumMountBatches}`,
      trace: request.traceFile,
      ...measured,
    };
  }
  if (!request.keepTrace) {
    fs.rmSync(request.traceFile, { force: true });
    return { valid: true, ...measured };
  }
  return { valid: true, trace: request.traceFile, ...measured };
}

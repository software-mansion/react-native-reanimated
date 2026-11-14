import fs from 'node:fs';
import path from 'node:path';

import { ANDROID_DEFINITION } from './android-definition.mts';
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
import {
  failureText,
  parseReportLine,
  scenarioReportOf,
} from './app-report.mts';
import type { ScenarioReport } from './app-report.mts';
import type { Clock } from './clock.mts';
import { ToolError } from './errors.mts';
import { expectedFrameShare } from './frames.mts';
import type { FrameBasis } from './frames.mts';
import { judgeWork } from './judge.mts';
import { traceConfig } from './perfetto.mts';
import type { TracedApp, TraceReading } from './perfetto.mts';
import type { LineStream } from './processes.mts';
import {
  COOL_DOWN_LIMIT_MS,
  MINIMUM_WAIT_MS,
  PROCESS_POLL_MS,
  READY_TIMEOUT_MS,
  timedSteps,
} from './samples.mts';
import type {
  InvalidSample,
  MeasuredSample,
  SampleObservations,
  SampleResult,
  SampleSteps,
} from './samples.mts';
import type { Scenario } from './scenarios.mts';

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
    frames: FrameBasis
  ) => Promise<TraceReading>;
}

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

export interface RunningApp {
  request: SampleRequest;
  device: SampleDevice;
  clock: Clock;
  steps: SampleSteps;
  watch: ReportWatch;
  coldStart: number;
  report: ScenarioReport;
  pid: number;
  jsThread: number;
}

type ReadyOutcome =
  | { ready: true; report: ScenarioReport }
  | { ready: false; reason: string };

interface TraceFiles {
  localConfig: string;
  remoteConfig: string;
  remoteTrace: string;
}

const COOL_DOWN_POLL_MS = 5_000;

const TEMPERATURE_TOLERANCE = 2;

export async function takeSample(
  request: SampleRequest,
  device: SampleDevice,
  collector: Collector,
  clock: Clock
): Promise<SampleResult> {
  return runLaunchedApp(request, device, clock, (app) =>
    measureRunningApp(app, collector)
  );
}

export async function runLaunchedApp<T>(
  request: SampleRequest,
  device: SampleDevice,
  clock: Clock,
  measure: (app: RunningApp) => Promise<T>
): Promise<T | InvalidSample> {
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
    return await measureReadyApp(
      { request, device, clock, steps, watch, coldStart: start.totalTime },
      measure
    );
  } finally {
    watch.stop();
    await device.forceStop(request.applicationId);
  }
}

export async function measureRunningApp(
  app: RunningApp,
  collector: Collector
): Promise<SampleResult> {
  const { request, device, watch, report, pid, jsThread } = app;
  const { applicationId } = request;
  const { timings, timed } = app.steps;
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
    watch.checkedFailure() ??
    (await processEnd(device, applicationId, pid, 'the trace'));
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
    collector.collect(
      request.traceFile,
      { applicationId, pid, jsThread },
      {
        refreshRate,
        share: expectedFrameShare(
          ANDROID_DEFINITION.frameSource,
          request.scenario
        ),
      }
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

export async function processEnd(
  device: SampleDevice,
  applicationId: string,
  pid: number,
  period: string
): Promise<string | null> {
  const current = await device.readPid(applicationId);
  if (current === pid) {
    return null;
  }
  return current === null
    ? `the app process ${pid} died during ${period}`
    : `the app process ${pid} ended during ${period}, process ${current} runs now`;
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
      this.#failure ??= failureText(report);
    } else if (report?.scenario === this.#scenario) {
      this.#report ??= scenarioReportOf(report);
    }
  }
}

async function measureReadyApp<T>(
  started: Omit<RunningApp, 'report' | 'pid' | 'jsThread'>,
  measure: (app: RunningApp) => Promise<T>
): Promise<T | InvalidSample> {
  const { request, device, watch } = started;
  const { applicationId } = request;
  const { timings, timed } = started.steps;
  const ready = await timed('ready', () =>
    waitForReady(device, started.clock, watch, applicationId)
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
  return measure({ ...started, report, pid, jsThread });
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

function judge(measured: MeasuredSample, request: SampleRequest): SampleResult {
  if (measured.thermalAfter > 0) {
    return {
      valid: false,
      cause: 'thermal',
      detail: `thermal status ${measured.thermalAfter} after the trace`,
      trace: request.traceFile,
      ...measured,
    };
  }
  return judgeWork(measured, request);
}

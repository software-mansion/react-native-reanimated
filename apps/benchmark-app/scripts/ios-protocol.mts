import { ToolError } from './errors.mts';
import { LAUNCHED_LINE } from './ios-device.mts';
import type { InAppState, SampleOrder } from './platform.mts';
import {
  COOL_DOWN_LIMIT_MS,
  PROCESS_POLL_MS,
  READY_TIMEOUT_MS,
  judgeWork,
  parseReportLine,
  timedSteps,
} from './protocol.mts';
import type {
  Clock,
  InvalidSample,
  SampleResult,
  SampleSteps,
  ScenarioReport,
} from './protocol.mts';
import { IOS_MINIMUM_MOUNT_BATCHES } from './scenarios.mts';
import { once } from './tools.mts';
import type { LineStream } from './tools.mts';
import { THERMAL_STATES } from './xctrace-metrics.mts';
import type { AppState } from './xctrace-metrics.mts';
import type { IosTracer } from './xctrace.mts';

export interface IosSampleDevice {
  terminate: (bundleIdentifier: string) => Promise<void>;
  launch: (
    bundleIdentifier: string,
    scenario: string | undefined,
    load: number | undefined,
    onLine: (line: string) => void
  ) => LineStream;
}

export interface IosSampleContext {
  device: IosSampleDevice;
  deviceName: string;
  tracer: IosTracer;
  clock: Clock;
  guard: InAppStateGuard;
}

export interface LaunchReport {
  pid: number;
  mainThread: number;
  refreshRate: number;
  thermalState: number;
  coldStart: number;
}

type Launch =
  | { started: true; appConsole: AppConsole; report: LaunchReport }
  | { started: false; appConsole: AppConsole; reason: string };

type StartedLaunch = Extract<Launch, { started: true }>;

type ReadyOutcome =
  | { ready: true; report: ScenarioReport }
  | { ready: false; reason: string };

export const REPORT_PREFIX = 'ReanimatedBenchmark: ';
export const MINIMUM_WAIT_MS = 10_000;
export const HOT_DEVICE_WAIT_MS = 30_000;
export const NOMINAL_THERMAL_STATE = 0;
export const SUPPORTED_REFRESH_RATE = 60;

export async function takeIosSample(
  order: SampleOrder,
  context: IosSampleContext
): Promise<SampleResult> {
  const { device } = context;
  const steps = timedSteps(context.clock);
  for (const applicationId of order.stopApplicationIds) {
    await device.terminate(applicationId);
  }
  const launch = await steps.timed('wait', () =>
    launchOnCoolDevice(order, context)
  );
  const stopApp = once(() => device.terminate(order.applicationId));
  return withCleanup(
    async () =>
      launch.started
        ? measureLaunchedApp(order, context, launch, steps, stopApp)
        : {
            valid: false,
            cause: 'crash',
            detail: launch.reason,
            timings: steps.timings,
          },
    async () => {
      launch.appConsole.stop();
      await stopApp();
    }
  );
}

export async function launchOnce(
  device: IosSampleDevice,
  applicationId: string,
  clock: Clock
) {
  const appConsole = new AppConsole(
    device,
    applicationId,
    undefined,
    undefined
  );
  await withCleanup(
    async () => {
      const launch = await waitForLaunch(appConsole, clock);
      if (typeof launch === 'string') {
        throw new ToolError(
          `${applicationId} did not write a LAUNCH line in its first launch after the install: ${launch}`
        );
      }
    },
    async () => {
      appConsole.stop();
      await device.terminate(applicationId);
    }
  );
}

export function parseLaunchLine(line: string): LaunchReport | null {
  const launch =
    /^LAUNCH pid=(\d+) mainThread=(\d+) refreshRate=(\d+) thermal=(\d+) coldStart=(\d+(?:\.\d+)?)$/.exec(
      line.trim()
    );
  return launch
    ? {
        pid: Number(launch[1]),
        mainThread: Number(launch[2]),
        refreshRate: Number(launch[3]),
        thermalState: Number(launch[4]),
        coldStart: Number(launch[5]),
      }
    : null;
}

export class InAppStateGuard {
  #reference: InAppState | null;

  constructor(reference: InAppState | null) {
    this.#reference = reference;
  }

  check(state: InAppState) {
    this.#reference ??= state;
    const reference = this.#reference;
    const changes = Object.keys(reference)
      .filter((key) => reference[key] !== state[key])
      .map((key) => `${key}: ${reference[key]} -> ${state[key]}`);
    if (changes.length > 0) {
      throw new ToolError(
        `The device state changed (read in the trace): ${changes.join(', ')}`
      );
    }
  }
}

export class AppConsole {
  readonly #scenario: string | undefined;
  readonly #stream: LineStream;
  #launched = false;
  #launch: LaunchReport | null = null;
  #report: ScenarioReport | null = null;
  #failure: string | null = null;

  constructor(
    device: IosSampleDevice,
    applicationId: string,
    scenario: string | undefined,
    load: number | undefined
  ) {
    this.#scenario = scenario;
    this.#stream = device.launch(applicationId, scenario, load, (line) =>
      this.#read(line)
    );
  }

  launch(): LaunchReport | null {
    return this.#launch;
  }

  readyOutcome(): ReadyOutcome | null {
    if (this.#failure) {
      return { ready: false, reason: this.#failure };
    }
    return this.#report ? { ready: true, report: this.#report } : null;
  }

  failure(): string | null {
    return this.#failure;
  }

  started(): boolean {
    return this.#launched;
  }

  ended(): boolean {
    const streamFailure = this.#stream.failure();
    if (streamFailure && !this.#launched) {
      throw new ToolError(`The app did not start: ${streamFailure.message}`);
    }
    return streamFailure !== null;
  }

  stop() {
    this.#stream.stop();
  }

  #read(line: string) {
    if (LAUNCHED_LINE.test(line)) {
      this.#launched = true;
    }
    if (!line.startsWith(REPORT_PREFIX)) {
      return;
    }
    const text = line.slice(REPORT_PREFIX.length);
    this.#launch ??= parseLaunchLine(text);
    const report = parseReportLine(text);
    if (report?.kind === 'failed') {
      this.#failure ??= `FAILED scenario=${report.scenario} reason=${report.reason}`;
    } else if (report && report.scenario === this.#scenario) {
      this.#report ??= {
        version: report.version,
        load: report.load,
        jsThread: report.jsThread,
      };
    }
  }
}

async function launchOnCoolDevice(
  order: SampleOrder,
  { device, clock }: IosSampleContext
): Promise<Launch> {
  const startedAt = clock.now();
  await clock.sleep(MINIMUM_WAIT_MS);
  while (true) {
    const appConsole = new AppConsole(
      device,
      order.applicationId,
      order.scenario,
      order.load
    );
    const report = await waitForLaunch(appConsole, clock);
    if (typeof report === 'string') {
      return { started: false, appConsole, reason: report };
    }
    if (report.thermalState === NOMINAL_THERMAL_STATE) {
      return { started: true, appConsole, report };
    }
    appConsole.stop();
    await device.terminate(order.applicationId);
    if (clock.now() - startedAt >= COOL_DOWN_LIMIT_MS) {
      throw new ToolError(
        `The device did not settle in ${COOL_DOWN_LIMIT_MS / 60_000} minutes: thermal state ${THERMAL_STATES[report.thermalState] ?? report.thermalState} at the launch of the app`
      );
    }
    await clock.sleep(HOT_DEVICE_WAIT_MS);
  }
}

async function waitForLaunch(
  appConsole: AppConsole,
  clock: Clock
): Promise<LaunchReport | string> {
  const deadline = clock.now() + READY_TIMEOUT_MS;
  while (true) {
    const report = appConsole.launch();
    if (report) {
      return report;
    }
    if (appConsole.readyOutcome()?.ready) {
      throw new ToolError(
        'The app wrote READY but no LAUNCH line that the driver can read. Build the app again from the current benchmark app source.'
      );
    }
    const failure = appConsole.failure();
    if (failure) {
      return failure;
    }
    if (appConsole.ended()) {
      return appConsole.launch() ?? 'the app process ended';
    }
    if (clock.now() >= deadline) {
      if (!appConsole.started()) {
        throw new ToolError(
          `The launch command did not start the app in ${READY_TIMEOUT_MS / 1000} s`
        );
      }
      return `no LAUNCH line in ${READY_TIMEOUT_MS / 1000} s`;
    }
    await clock.sleep(PROCESS_POLL_MS);
  }
}

async function measureLaunchedApp(
  order: SampleOrder,
  context: IosSampleContext,
  { appConsole, report: launch }: StartedLaunch,
  steps: SampleSteps,
  stopApp: () => Promise<void>
): Promise<SampleResult> {
  const { tracer, guard } = context;
  const { applicationId, traceFile } = order;
  const { timings, timed } = steps;
  const ready = await timed('ready', () =>
    waitForReady(appConsole, context.clock)
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
  const { pid, refreshRate } = launch;
  if (refreshRate !== SUPPORTED_REFRESH_RATE) {
    throw new ToolError(
      `The display of the device has a maximum refresh rate of ${refreshRate} Hz. The driver supports only a display with a fixed rate of ${SUPPORTED_REFRESH_RATE} Hz.`
    );
  }
  const observed = { report, pid, refreshRate, timings };

  const endedBeforeTrace = appEnd(appConsole, pid, 'before the trace');
  if (endedBeforeTrace !== null) {
    return {
      valid: false,
      cause: 'crash',
      detail: endedBeforeTrace,
      ...observed,
    };
  }
  const recorded = await timed('trace', () =>
    tracer
      .record(context.deviceName, pid, traceFile)
      .catch((error: Error) => error)
  );
  const endedInTrace = appEnd(appConsole, pid, 'during the trace');
  if (endedInTrace !== null) {
    return crash(endedInTrace, observed, traceFile);
  }
  if (recorded instanceof Error) {
    throw recorded;
  }
  await stopApp();

  const reading = await timed('parse', () =>
    tracer.collect(traceFile, {
      pid,
      mainThread: launch.mainThread,
      jsThread,
      refreshRate,
    })
  );
  if (!reading.processLived) {
    return crash(reading.detail, observed, traceFile);
  }
  const states = reading.appStates.map((state) =>
    inAppStateOf(state, refreshRate)
  );
  states.forEach((state) => guard.check(state));
  const measured = {
    ...observed,
    thermalAfter: reading.thermalState,
    inAppState: states[0],
    metrics: { ...reading.metrics, coldStart: launch.coldStart },
  };
  if (reading.thermalState > NOMINAL_THERMAL_STATE) {
    return {
      valid: false,
      cause: 'thermal',
      detail: `thermal state ${THERMAL_STATES[reading.thermalState]} during the trace`,
      trace: traceFile,
      ...measured,
    };
  }
  return judgeWork(
    measured,
    order,
    IOS_MINIMUM_MOUNT_BATCHES[order.scenario] ?? 0
  );
}

async function waitForReady(
  appConsole: AppConsole,
  clock: Clock
): Promise<ReadyOutcome> {
  const deadline = clock.now() + READY_TIMEOUT_MS;
  while (clock.now() < deadline) {
    const outcome = appConsole.readyOutcome();
    if (outcome) {
      return outcome;
    }
    if (appConsole.ended()) {
      return (
        appConsole.readyOutcome() ?? {
          ready: false,
          reason: 'the app process ended',
        }
      );
    }
    await clock.sleep(PROCESS_POLL_MS);
  }
  return (
    appConsole.readyOutcome() ?? {
      ready: false,
      reason: `no READY line in ${READY_TIMEOUT_MS / 1000} s`,
    }
  );
}

function appEnd(
  appConsole: AppConsole,
  pid: number,
  moment: string
): string | null {
  return (
    appConsole.failure() ??
    (appConsole.ended() ? `the app process ${pid} ended ${moment}` : null)
  );
}

function crash(
  detail: string,
  observed: Pick<InvalidSample, 'report' | 'pid' | 'refreshRate' | 'timings'>,
  traceFile: string
): InvalidSample {
  return {
    valid: false,
    cause: 'crash',
    detail,
    trace: traceFile,
    ...observed,
  };
}

function inAppStateOf(state: AppState, refreshRate: number): InAppState {
  return { refreshRate, ...state };
}

async function withCleanup<T>(
  action: () => Promise<T>,
  cleanUp: () => Promise<void>
): Promise<T> {
  let result: T;
  try {
    result = await action();
  } catch (error) {
    await cleanUp().catch(() => {});
    throw error;
  }
  await cleanUp();
  return result;
}

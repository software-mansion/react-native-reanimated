import {
  failureText,
  parseLaunchLine,
  parseReportLine,
  scenarioReportOf,
} from './app-report.mts';
import type { LaunchReport, ScenarioReport } from './app-report.mts';
import type { Clock } from './clock.mts';
import { ToolError } from './errors.mts';
import { expectedFrameShare } from './frames.mts';
import { IOS_DEFINITION } from './ios-definition.mts';
import { LAUNCHED_LINE } from './ios-device.mts';
import { judgeWork } from './judge.mts';
import { RECORDING_SECONDS } from './measurement-rules.mts';
import type { InAppState, SampleOrder } from './platform.mts';
import type { LineStream } from './processes.mts';
import {
  COOL_DOWN_LIMIT_MS,
  PROCESS_POLL_MS,
  READY_TIMEOUT_MS,
  timedSteps,
} from './samples.mts';
import type { InvalidSample, SampleResult, SampleSteps } from './samples.mts';
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

interface AppLaunch {
  applicationId: string;
  scenario?: string;
  load?: number;
}

type Launch =
  | { started: true; appConsole: AppConsole; report: LaunchReport }
  | { started: false; appConsole: AppConsole; reason: string };

type StartedLaunch = Extract<Launch, { started: true }>;

type ReadyOutcome =
  | { ready: true; report: ScenarioReport }
  | { ready: false; reason: string };

interface Received<T> {
  value: T;
  at: number;
}

export const REPORT_PREFIX = 'ReanimatedBenchmark: ';
export const MINIMUM_WAIT_MS = 10_000;
export const HOT_DEVICE_WAIT_MS = 30_000;
export const NOMINAL_THERMAL_STATE = 0;
export const SUPPORTED_REFRESH_RATE = 60;

export async function takeIosSample(
  order: SampleOrder,
  context: IosSampleContext
): Promise<SampleResult> {
  const steps = timedSteps(context.clock);
  for (const applicationId of order.stopApplicationIds) {
    await context.device.terminate(applicationId);
  }
  const launch = await steps.timed('wait', () =>
    launchOnCoolDevice(order, context)
  );
  return withCleanup(
    async () =>
      launch.started
        ? measureLaunchedApp(order, context, launch, steps)
        : {
            valid: false,
            cause: 'crash',
            detail: launch.reason,
            timings: steps.timings,
          },
    () => launch.appConsole.close()
  );
}

export async function launchOnce(
  device: IosSampleDevice,
  applicationId: string,
  clock: Clock
) {
  const launch = await startLaunch(device, clock, { applicationId });
  await withCleanup(
    async () => {
      if (!launch.started) {
        throw new ToolError(
          `${applicationId} did not write a LAUNCH line in its first launch after the install: ${launch.reason}`
        );
      }
    },
    () => launch.appConsole.close()
  );
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
  readonly #device: IosSampleDevice;
  readonly #clock: Clock;
  readonly #launch: AppLaunch;
  readonly #stream: LineStream;
  #launched = false;
  #launchReport: Received<LaunchReport> | null = null;
  #scenarioReport: Received<ScenarioReport> | null = null;
  #failure: string | null = null;
  #closing: Promise<void> | null = null;

  constructor(device: IosSampleDevice, clock: Clock, launch: AppLaunch) {
    this.#device = device;
    this.#clock = clock;
    this.#launch = launch;
    this.#stream = device.launch(
      launch.applicationId,
      launch.scenario,
      launch.load,
      (line) => this.#read(line)
    );
  }

  launchBefore(deadline: number): LaunchReport | null {
    return valueBefore(this.#launchReport, deadline);
  }

  hasScenarioReportBefore(deadline: number): boolean {
    return valueBefore(this.#scenarioReport, deadline) !== null;
  }

  readyBefore(deadline: number): ReadyOutcome | null {
    if (this.#failure) {
      return { ready: false, reason: this.#failure };
    }
    const report = valueBefore(this.#scenarioReport, deadline);
    return report ? { ready: true, report } : null;
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

  close(): Promise<void> {
    this.#closing ??= (async () => {
      this.#stream.stop();
      await this.#device.terminate(this.#launch.applicationId);
    })();
    return this.#closing;
  }

  #read(line: string) {
    if (LAUNCHED_LINE.test(line)) {
      this.#launched = true;
    }
    if (!line.startsWith(REPORT_PREFIX)) {
      return;
    }
    const text = line.slice(REPORT_PREFIX.length);
    const at = this.#clock.now();
    const launch = parseLaunchLine(text);
    if (launch) {
      this.#launchReport ??= { value: launch, at };
    }
    const report = parseReportLine(text);
    if (report?.kind === 'failed') {
      this.#failure ??= failureText(report);
    } else if (report && report.scenario === this.#launch.scenario) {
      this.#scenarioReport ??= { value: scenarioReportOf(report), at };
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
    const launch = await startLaunch(device, clock, order);
    if (
      !launch.started ||
      launch.report.thermalState === NOMINAL_THERMAL_STATE
    ) {
      return launch;
    }
    await launch.appConsole.close();
    if (clock.now() - startedAt >= COOL_DOWN_LIMIT_MS) {
      throw new ToolError(
        `The device did not settle in ${COOL_DOWN_LIMIT_MS / 60_000} minutes: thermal state ${THERMAL_STATES[launch.report.thermalState] ?? launch.report.thermalState} at the launch of the app`
      );
    }
    await clock.sleep(HOT_DEVICE_WAIT_MS);
  }
}

async function startLaunch(
  device: IosSampleDevice,
  clock: Clock,
  launch: AppLaunch
): Promise<Launch> {
  const appConsole = new AppConsole(device, clock, launch);
  try {
    const report = await waitForLaunch(appConsole, clock);
    return typeof report === 'string'
      ? { started: false, appConsole, reason: report }
      : { started: true, appConsole, report };
  } catch (error) {
    await appConsole.close().catch(() => {});
    throw error;
  }
}

async function waitForLaunch(
  appConsole: AppConsole,
  clock: Clock
): Promise<LaunchReport | string> {
  const deadline = clock.now() + READY_TIMEOUT_MS;
  while (true) {
    const report = appConsole.launchBefore(deadline);
    if (report) {
      return report;
    }
    if (appConsole.hasScenarioReportBefore(deadline)) {
      throw new ToolError(
        'The app wrote READY but no LAUNCH line that the driver can read. Build the app again from the current benchmark app source.'
      );
    }
    const failure = appConsole.failure();
    if (failure) {
      return failure;
    }
    if (appConsole.ended()) {
      return 'the app process ended';
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
  steps: SampleSteps
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
  await appConsole.close();

  const reading = await timed('parse', () =>
    tracer.collect(traceFile, {
      pid,
      mainThread: launch.mainThread,
      jsThread,
      frames: {
        refreshRate,
        share: expectedFrameShare(IOS_DEFINITION.frameSource, order.scenario),
      },
      recordingSeconds: RECORDING_SECONDS,
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
    traceWindow: reading.window,
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
  return judgeWork(measured, order);
}

async function waitForReady(
  appConsole: AppConsole,
  clock: Clock
): Promise<ReadyOutcome> {
  const deadline = clock.now() + READY_TIMEOUT_MS;
  while (clock.now() < deadline) {
    const outcome = appConsole.readyBefore(deadline);
    if (outcome) {
      return outcome;
    }
    if (appConsole.ended()) {
      return (
        appConsole.readyBefore(deadline) ?? {
          ready: false,
          reason: 'the app process ended',
        }
      );
    }
    await clock.sleep(PROCESS_POLL_MS);
  }
  return {
    ready: false,
    reason: `no READY line in ${READY_TIMEOUT_MS / 1000} s`,
  };
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

function valueBefore<T>(received: Received<T> | null, deadline: number) {
  return received !== null && received.at < deadline ? received.value : null;
}

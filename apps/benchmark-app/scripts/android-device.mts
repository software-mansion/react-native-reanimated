import { ToolError } from './errors.mts';
import type { LineStream, Processes } from './tools.mts';

export interface DeviceState {
  hardwareSerial: string;
  model: string;
  fingerprint: string;
  sdk: number;
  abi: string;
  refreshRate: number;
  brightness: number;
  brightnessMode: string;
  batteryLevel: number;
  batteryStatus: string;
  chargeState: string;
  wifiEnabled: boolean;
  wifiConnected: boolean;
  thermalStatus: number;
  batteryTemperature: number;
}

export interface BatteryInfo {
  level: number;
  status: string;
  chargeState: string;
  temperature: number;
}

export interface WifiState {
  wifiEnabled: boolean;
  wifiConnected: boolean;
}

export type ActivityStart =
  | { started: true; totalTime: number }
  | { started: false; reason: string };

export interface CleanupDevice {
  forceStop: (applicationId: string) => Promise<void>;
  stopTraces: () => Promise<void>;
  removeAllTraces: () => Promise<void>;
}

export type StateMoment = 'before the trace' | 'after the trace';

export const COMPARED_STATE_KEYS = [
  'hardwareSerial',
  'fingerprint',
  'refreshRate',
  'brightness',
  'brightnessMode',
  'chargeState',
  'batteryLevel',
  'wifiEnabled',
  'wifiConnected',
] as const satisfies readonly (keyof DeviceState)[];

export const IDLE_STATE_KEYS = COMPARED_STATE_KEYS.filter(
  (key) => key !== 'refreshRate'
);

export const MINIMUM_SDK = 31;
export const REQUIRED_ABI = 'arm64-v8a';
export const ACTIVITY = 'com.reanimatedbenchmark.MainActivity';
export const REPORT_TAG = 'ReanimatedBenchmark';
export const REMOTE_TRACE_DIR = '/data/misc/perfetto-traces';
export const REMOTE_CONFIG_DIR = '/data/misc/perfetto-configs';
export const REMOTE_TRACE_PREFIX = 'reanimated-benchmark-';
export const DEVICE_COMMAND_TIMEOUT_MS = 60_000;
export const INSTALL_TIMEOUT_MS = 5 * 60_000;
export const COMPILE_TIMEOUT_MS = 10 * 60_000;
export const TRACE_TIMEOUT_MS = 2 * 60_000;
export const PULL_TIMEOUT_MS = 5 * 60_000;

const BATTERY_STATUSES: Record<string, string> = {
  '1': 'unknown',
  '2': 'charging',
  '3': 'discharging',
  '4': 'not charging',
  '5': 'full',
};
const POWER_SOURCES = [
  ['AC powered', 'ac'],
  ['USB powered', 'usb'],
  ['Wireless powered', 'wireless'],
  ['Dock powered', 'dock'],
] as const;
const BRIGHTNESS_MODES: Record<string, string> = {
  '0': 'manual',
  '1': 'automatic',
};

export class AndroidDevice {
  readonly serial: string;
  readonly #processes: Processes;
  readonly #adb: string;

  constructor(processes: Processes, adb: string, serial: string) {
    this.#processes = processes;
    this.#adb = adb;
    this.serial = serial;
  }

  async checkConnected() {
    const state = (
      await this.#processes
        .run(this.#adb, ['-s', this.serial, 'get-state'])
        .catch(() => null)
    )?.stdout.trim();
    if (state !== 'device') {
      throw new ToolError(
        `No ready device with serial ${this.serial} (see \`adb devices\`)`
      );
    }
  }

  async checkInstalled(applicationId: string) {
    const output = await this.shell(['pm', 'path', applicationId]).catch(
      () => ''
    );
    if (!output.includes('package:')) {
      throw new ToolError(
        `${applicationId} is not installed on ${this.serial}`
      );
    }
  }

  async readState(): Promise<DeviceState> {
    const battery = parseBattery(await this.shell(['dumpsys', 'battery']));
    return {
      hardwareSerial: await this.property('ro.serialno'),
      model: await this.property('ro.product.model'),
      fingerprint: await this.property('ro.build.fingerprint'),
      sdk: Number(await this.property('ro.build.version.sdk')),
      abi: await this.property('ro.product.cpu.abi'),
      refreshRate: await this.readRefreshRate(),
      brightness: Number(await this.setting('screen_brightness')),
      brightnessMode:
        BRIGHTNESS_MODES[await this.setting('screen_brightness_mode')] ??
        'unknown',
      batteryLevel: battery.level,
      batteryStatus: battery.status,
      chargeState: battery.chargeState,
      ...parseWifiStatus(await this.shell(['cmd', 'wifi', 'status'])),
      thermalStatus: await this.readThermalStatus(),
      batteryTemperature: battery.temperature,
    };
  }

  async readThermalStatus(): Promise<number> {
    return parseThermalStatus(await this.shell(['dumpsys', 'thermalservice']));
  }

  async readBatteryTemperature(): Promise<number> {
    return parseBattery(await this.shell(['dumpsys', 'battery'])).temperature;
  }

  async readRefreshRate(): Promise<number> {
    return parseActiveRefreshRate(await this.shell(['dumpsys', 'display']));
  }

  async forceStop(applicationId: string) {
    await this.shell(['am', 'force-stop', applicationId]);
  }

  async clearLog() {
    await this.adb(['logcat', '-c']);
  }

  async startActivity(
    applicationId: string,
    scenario: string,
    load: number | undefined
  ): Promise<ActivityStart> {
    const loadExtra =
      load === undefined ? [] : ['--ei', 'benchmarkLoad', String(load)];
    const output = await this.shell([
      'am',
      'start',
      '-W',
      '-S',
      '-n',
      `${applicationId}/${ACTIVITY}`,
      '--es',
      'benchmarkScenario',
      scenario,
      ...loadExtra,
    ]).catch((error: Error) => error.message);
    return parseActivityStart(output);
  }

  streamReports(onLine: (line: string) => void): LineStream {
    return this.#processes.streamLines(
      this.#adb,
      ['-s', this.serial, 'logcat', '-v', 'raw', '-s', `${REPORT_TAG}:I`],
      onLine
    );
  }

  async readPid(applicationId: string): Promise<number | null> {
    return parsePid(await this.shell(['pidof', applicationId, '||', 'true']));
  }

  async recordTrace(
    remoteConfig: string,
    remoteTrace: string,
    timeoutMs = TRACE_TIMEOUT_MS
  ) {
    await this.shell(
      ['perfetto', '--txt', '-c', remoteConfig, '-o', remoteTrace],
      timeoutMs
    );
  }

  async push(localPath: string, remotePath: string) {
    await this.adb(['push', localPath, remotePath]);
  }

  async pull(
    remotePath: string,
    localPath: string,
    timeoutMs = PULL_TIMEOUT_MS
  ) {
    await this.adb(['pull', remotePath, localPath], timeoutMs);
  }

  async remove(remotePath: string) {
    await this.shell(['rm', '-f', remotePath]);
  }

  async stopTraces() {
    // The bracket stops the pattern from matching the shell that runs pkill.
    const pattern = `[${REMOTE_TRACE_PREFIX[0]}]${REMOTE_TRACE_PREFIX.slice(1)}`;
    await this.shell([`pkill -f '${pattern}' || true`]);
  }

  async removeAllTraces() {
    await this.shell([
      `rm -f ${REMOTE_TRACE_DIR}/${REMOTE_TRACE_PREFIX}* ${REMOTE_CONFIG_DIR}/${REMOTE_TRACE_PREFIX}*`,
    ]);
  }

  async install(apk: string, timeoutMs = INSTALL_TIMEOUT_MS) {
    await this.adb(['install', '-r', apk], timeoutMs);
  }

  async compileForSpeed(applicationId: string, timeoutMs = COMPILE_TIMEOUT_MS) {
    await this.shell(
      ['cmd', 'package', 'compile', '-m', 'speed', '-f', applicationId],
      timeoutMs
    );
  }

  async property(name: string): Promise<string> {
    return (await this.shell(['getprop', name])).trim();
  }

  async shell(
    command: string[],
    timeoutMs = DEVICE_COMMAND_TIMEOUT_MS
  ): Promise<string> {
    return this.adb(['shell', ...command], timeoutMs);
  }

  async setting(name: string): Promise<string> {
    return (await this.shell(['settings', 'get', 'system', name])).trim();
  }

  async adb(
    args: string[],
    timeoutMs = DEVICE_COMMAND_TIMEOUT_MS
  ): Promise<string> {
    return (
      await this.#processes.run(this.#adb, ['-s', this.serial, ...args], {
        timeoutMs,
      })
    ).stdout;
  }
}

export class DeviceStateGuard {
  readonly #start: DeviceState;
  #inAppReference: DeviceState | null = null;

  constructor(start: DeviceState, inAppRefreshRate: number | null = null) {
    this.#start = start;
    if (inAppRefreshRate !== null) {
      this.#inAppReference = { ...start, refreshRate: inAppRefreshRate };
    }
  }

  checkIdle(state: DeviceState) {
    throwOnChanges(
      changedStateKeys(this.#start, state, IDLE_STATE_KEYS),
      'before the cool-down'
    );
  }

  checkInApp(state: DeviceState, moment: StateMoment): number {
    this.#inAppReference ??= { ...this.#start, refreshRate: state.refreshRate };
    throwOnChanges(changedStateKeys(this.#inAppReference, state), moment);
    return state.refreshRate;
  }
}

export async function cleanUpDevice(
  device: CleanupDevice,
  applicationIds: readonly string[],
  log: (message: string) => void
) {
  const steps = [
    ...applicationIds.map((applicationId) => ({
      name: `stop ${applicationId}`,
      run: () => device.forceStop(applicationId),
    })),
    { name: 'stop perfetto', run: () => device.stopTraces() },
    {
      name: 'remove the traces and trace configs on the device',
      run: () => device.removeAllTraces(),
    },
  ];
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      log(`cleanup: cannot ${step.name}: ${(error as Error).message}`);
    }
  }
}

export function checkSdk(state: DeviceState) {
  if (state.sdk < MINIMUM_SDK) {
    throw new ToolError(
      `The device runs SDK ${state.sdk}. The frame timeline needs SDK ${MINIMUM_SDK} or newer.`
    );
  }
}

export function checkAbi(state: DeviceState) {
  if (state.abi !== REQUIRED_ABI) {
    throw new ToolError(
      `The device ABI is ${state.abi}. The builds are for ${REQUIRED_ABI} only.`
    );
  }
}

export function parseBattery(output: string): BatteryInfo {
  const fields = new Map<string, string>();
  for (const line of output.split('\n')) {
    const match = /^\s*([^:]+):\s*(.*)$/.exec(line);
    const key = match?.[1].trim();
    if (match && key && !fields.has(key)) {
      fields.set(key, match[2].trim());
    }
  }
  const level = Number(fields.get('level'));
  const temperature = Number(fields.get('temperature'));
  if (!Number.isFinite(level) || !Number.isFinite(temperature)) {
    throw new ToolError(
      `Cannot read the battery level and temperature from:\n${output}`
    );
  }
  const sources = POWER_SOURCES.filter(
    ([field]) => fields.get(field) === 'true'
  ).map(([, source]) => source);
  return {
    level,
    status: BATTERY_STATUSES[fields.get('status') ?? ''] ?? 'unknown',
    chargeState: sources.length > 0 ? sources.join('+') : 'none',
    temperature: temperature / 10,
  };
}

export function parseActiveRefreshRate(output: string): number {
  const deviceInfo = /DisplayDeviceInfo\{.*/.exec(output)?.[0] ?? '';
  const rate =
    /[{,]\s*renderFrameRate ([\d.]+)/.exec(deviceInfo)?.[1] ??
    activeModeRate(deviceInfo);
  if (rate === undefined) {
    throw new ToolError(
      'Cannot read the render frame rate or the active display mode from dumpsys display'
    );
  }
  return Math.round(Number(rate) * 10) / 10;
}

export function parseWifiStatus(output: string): WifiState {
  return {
    wifiEnabled: /^Wifi is enabled/m.test(output),
    wifiConnected: /^Wifi is connected/m.test(output),
  };
}

export function parseThermalStatus(output: string): number {
  const match = /^\s*Thermal Status:\s*(\d+)/m.exec(output);
  if (!match) {
    throw new ToolError(
      `Cannot read "Thermal Status" from dumpsys thermalservice:\n${output.slice(0, 500)}`
    );
  }
  return Number(match[1]);
}

export function parseActivityStart(output: string): ActivityStart {
  const error = /^Error: .*$/m.exec(output) ?? /^Error.*$/m.exec(output);
  const status = /^Status:\s*(\S+)/m.exec(output)?.[1];
  const totalTime = /^TotalTime:\s*(\d+)/m.exec(output)?.[1];
  if (error || status !== 'ok' || totalTime === undefined) {
    return {
      started: false,
      reason: error?.[0] ?? `am start status ${status ?? 'missing'}`,
    };
  }
  return { started: true, totalTime: Number(totalTime) };
}

export function parsePid(output: string): number | null {
  const pids = output.trim().split(/\s+/).filter(Boolean);
  if (pids.length > 1) {
    throw new ToolError(
      `Several processes have the app name: ${pids.join(' ')}`
    );
  }
  return pids.length === 1 ? Number(pids[0]) : null;
}

export function changedStateKeys(
  reference: DeviceState,
  current: DeviceState,
  keys: readonly (keyof DeviceState)[] = COMPARED_STATE_KEYS
): string[] {
  return keys
    .filter((key) => reference[key] !== current[key])
    .map((key) => `${key}: ${reference[key]} -> ${current[key]}`);
}

function throwOnChanges(changes: string[], moment: string) {
  if (changes.length > 0) {
    throw new ToolError(
      `The device state changed (read ${moment}): ${changes.join(', ')}`
    );
  }
}

function activeModeRate(deviceInfo: string): string | undefined {
  const modeId = /[{,]\s*modeId (\d+)/.exec(deviceInfo)?.[1];
  return modeId
    ? new RegExp(`\\{id=${modeId},[^}]*?fps=([\\d.]+)`).exec(deviceInfo)?.[1]
    : undefined;
}

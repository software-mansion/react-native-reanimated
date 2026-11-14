import fs from 'node:fs';
import path from 'node:path';
import { after, before, beforeEach } from 'node:test';

import type { AndroidDevice, DeviceState } from '../android-device.mts';
import { androidPlatform } from '../android-platform.mts';
import type {
  AndroidDependencies,
  AndroidSampling,
} from '../android-platform.mts';
import type { Clock } from '../clock.mts';
import type { CommandContext } from '../command-context.mts';
import { ToolError } from '../errors.mts';
import type { MeasurementDependencies } from '../measurement.mts';
import { REPOSITORY_ROOT } from '../paths.mts';
import type { TraceMetrics } from '../perfetto.mts';
import type { DeviceTarget } from '../platform.mts';
import type { Processes } from '../processes.mts';
import type { BuiltVariant } from '../variant-build.mts';

export interface FakeOptions {
  interruptAtTrace?: number;
  state?: DeviceState;
  toolVersion?: string;
  metrics?: Partial<TraceMetrics>;
  meminfo?: (applicationId: string, msAfterStart: number) => string;
  meminfoMs?: (reading: number) => number;
  frameCountAt?: (msAfterStart: number) => number;
  gfxinfoPid?: number;
  gfxinfoNoProcessAt?: number;
  batteryLevelAt?: (time: number) => number;
  diesAtReading?: number;
}

export interface TestRoot {
  root: string;
  runsDir: string;
  configFile: string;
  traceProcessor: string;
  apkOf: (variant: string) => string;
}

export const SERIAL = 'SERIAL1';
export const DEVICE: DeviceTarget = { platform: 'android', id: SERIAL };
export const PID = 100;

const GFXINFO = fs.readFileSync(
  path.join(import.meta.dirname, 'fixtures', 'gfxinfo.txt'),
  'utf8'
);

export const STATE: DeviceState = {
  model: 'Pixel',
  hardwareSerial: 'HW1',
  fingerprint: 'google/pixel:17/X/1:user/release-keys',
  sdk: 37,
  abi: 'arm64-v8a',
  refreshRate: 60,
  brightness: 102,
  brightnessMode: 'manual',
  batteryLevel: 80,
  batteryStatus: 'charging',
  chargeState: 'usb',
  wifiEnabled: true,
  wifiConnected: true,
  thermalStatus: 0,
  batteryTemperature: 30,
};

export const METRICS: TraceMetrics = {
  frameDurationMedian: 8,
  frameDurationP90: 10,
  frameDurationP95: 11,
  frameDurationP99: 14,
  jankyFrames: 0.01,
  frameTimelineDurationMedian: 16,
  frameTimelineDurationP95: 33,
  frameTimelineFrameCount: 600,
  jankFlaggedFrames: 0.02,
  appDeadlineMissedFrames: 0.01,
  drawFrameMedian: 6,
  drawFrameP95: 9,
  uiThreadCpu: 120,
  jsThreadCpu: 80,
  renderThreadCpu: 60,
  otherThreadsCpu: 140,
  processCpu: 400,
  uiThreadCpuWork: 240000,
  processCpuWork: 800000,
  mountBatchCount: 590,
  memory: 150000,
  windowMemoryDelta: 100,
  frameCount: 600,
  expectedFrameCount: 600,
};

export function useTestRoot(name: string, config: object): TestRoot {
  const root = path.join(
    REPOSITORY_ROOT,
    '.tmp',
    'benchmarks',
    'tests',
    `${name}-${process.pid}`
  );
  const testRoot: TestRoot = {
    root,
    runsDir: path.join(root, 'runs'),
    configFile: path.join(root, 'config.json'),
    traceProcessor: path.join(root, 'trace_processor_shell'),
    apkOf: (variant) => path.join(root, 'builds', variant, 'app-release.apk'),
  };
  let previousAndroidHome: string | undefined;

  before(() => {
    previousAndroidHome = process.env.ANDROID_HOME;
    fs.mkdirSync(path.join(root, 'sdk', 'platform-tools'), { recursive: true });
    fs.writeFileSync(path.join(root, 'sdk', 'platform-tools', 'adb'), '');
    fs.writeFileSync(testRoot.traceProcessor, '');
    process.env.ANDROID_HOME = path.join(root, 'sdk');
  });

  after(() => {
    process.env.ANDROID_HOME = previousAndroidHome;
    fs.rmSync(root, { recursive: true, force: true });
  });

  beforeEach(() => {
    fs.rmSync(testRoot.runsDir, { recursive: true, force: true });
    for (const variant of ['a', 'b']) {
      fs.mkdirSync(path.join(root, 'builds', variant), { recursive: true });
      fs.writeFileSync(testRoot.apkOf(variant), `apk ${variant}`);
    }
    fs.writeFileSync(testRoot.configFile, JSON.stringify(config));
  });

  return testRoot;
}

export function createFake(testRoot: TestRoot, options: FakeOptions = {}) {
  let time = 0;
  let startedAt = 0;
  let traces = 0;
  let readings = 0;
  let gfxinfoReads = 0;
  let alive = true;
  let scenario = '';
  let interrupt: (() => Promise<void>) | null = null;
  const installs: string[] = [];
  const logs: string[] = [];
  const clock: Clock = {
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
  };
  const device = {
    checkConnected: async () => {},
    readState: async () => {
      const state = options.state ?? STATE;
      return options.batteryLevelAt
        ? { ...state, batteryLevel: options.batteryLevelAt(time) }
        : state;
    },
    readBattery: async () => ({
      level:
        options.batteryLevelAt?.(time) ?? (options.state ?? STATE).batteryLevel,
      status: 'charging',
      chargeState: 'usb',
      temperature: 30,
    }),
    install: async (apk: string) => void installs.push(apk),
    compileForSpeed: async () => {},
    forceStop: async () => {},
    stopTraces: async () => {},
    removeAllTraces: async () => {},
    readThermalStatus: async () => 0,
    readBatteryTemperature: async () => 30,
    clearLog: async () => {},
    startActivity: async (_id: string, name: string) => {
      scenario = name;
      startedAt = time;
      alive = true;
      return { started: true, totalTime: 300 };
    },
    streamReports: (onLine: (line: string) => void) => {
      onLine(`READY scenario=${scenario} version=1 load=1 jsThread=4350`);
      return { stop: () => {}, failure: () => null };
    },
    readPid: async () => (alive ? PID : null),
    readMeminfo: async (applicationId: string) => {
      readings++;
      if (readings === options.diesAtReading) {
        alive = false;
      }
      const output = options.meminfo?.(applicationId, time - startedAt) ?? '';
      time += options.meminfoMs?.(readings) ?? 0;
      return output;
    },
    readGfxinfo: async (applicationId: string) => {
      gfxinfoReads++;
      if (gfxinfoReads === options.gfxinfoNoProcessAt) {
        return `No process found for: ${applicationId}\n`;
      }
      const msAfterStart = time - startedAt;
      const frames =
        options.frameCountAt?.(msAfterStart) ??
        Math.floor((msAfterStart / 1000) * 60);
      return GFXINFO.replace(
        `pid 2617 [com.google.android.apps.nexuslauncher]`,
        `pid ${options.gfxinfoPid ?? PID} [${applicationId}]`
      ).replace(
        'Total frames rendered: 24',
        `Total frames rendered: ${frames}`
      );
    },
    push: async () => {},
    recordTrace: async () => {
      traces++;
      if (traces === options.interruptAtTrace) {
        await interrupt?.();
        throw new ToolError('the device connection ended');
      }
    },
    pull: async (_remote: string, local: string) =>
      fs.writeFileSync(local, 'trace'),
    remove: async () => {},
  };
  const android: AndroidDependencies = {
    buildVariant: async ({ key }) =>
      ({
        variant: key,
        buildKey: `key-${key}`,
        directory: path.join(testRoot.root, 'builds', key),
        artifact: testRoot.apkOf(key),
        applicationId: `com.reanimatedbenchmark.${key}`,
        installedVersions: { reanimated: '4.7.1', worklets: '0.13.1' },
        effectiveFlags: { reanimated: {}, worklets: {} },
      }) satisfies BuiltVariant,
    createDevice: () => device as unknown as AndroidDevice,
    createCollector: () => ({
      collect: async () => ({
        processLived: true,
        metrics: { ...METRICS, ...options.metrics },
      }),
    }),
    clock,
  };
  const dependencies: MeasurementDependencies<AndroidSampling> = {
    platform: androidPlatform(android),
    runsDir: testRoot.runsDir,
  };
  const processes = {
    run: async () => ({
      stdout: `${options.toolVersion ?? '1.0'}\n`,
      stderr: '',
    }),
  } as unknown as Processes;
  const context: CommandContext = {
    processes,
    log: (message) => void logs.push(message),
    onInterrupt: (action) => {
      interrupt = action;
    },
  };
  return { dependencies, context, installs, logs };
}

export function onlyRunFolder(testRoot: TestRoot): string {
  const [folder] = fs.readdirSync(testRoot.runsDir);
  return path.join(testRoot.runsDir, folder);
}

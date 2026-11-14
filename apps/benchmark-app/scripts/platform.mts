import type { DeviceState as AndroidDeviceState } from './android-device.mts';
import type { FrameSource } from './frames.mts';
import type { IosDeviceState, IosToolVersions } from './ios-device.mts';
import type { ComparedMetric } from './metrics.mts';
import type { SampleResult } from './protocol.mts';
import type { Scenario } from './scenarios.mts';
import type {
  Processes,
  ToolVersions as AndroidToolVersions,
} from './tools.mts';
import type { BuildRequest, BuiltVariant } from './variant-build.mts';

export type PlatformName = 'android' | 'ios';

export interface DeviceTarget {
  platform: PlatformName;
  id: string;
}

export type DeviceState = AndroidDeviceState | IosDeviceState;

export type ToolVersions = AndroidToolVersions | IosToolVersions;

export type InAppState = Record<string, string | number | boolean>;

export interface MetricDefinition {
  names: readonly string[];
  unit: string;
  source: string;
  interval: string;
  limits: string;
}

export interface PlatformDefinition {
  name: PlatformName;
  verdictMetrics: readonly ComparedMetric[];
  advisoryMetrics: readonly ComparedMetric[];
  frameSource: FrameSource;
  metricDefinitions: readonly MetricDefinition[];
}

export interface PlatformOptions {
  traceProcessor?: string;
  signCommand?: string;
}

export interface SampleOrder {
  applicationId: string;
  stopApplicationIds: string[];
  scenario: Scenario;
  load?: number;
  traceFile: string;
  keepTrace: boolean;
}

export interface SamplingReference {
  start: DeviceState;
  appRefreshRate: number | null;
  inAppState: InAppState | null;
  comparesBatteryLevel: boolean;
}

export interface IdleState {
  batteryLevel?: number;
}

export interface Sampling {
  checkIdle: () => Promise<IdleState>;
  takeSample: (order: SampleOrder) => Promise<SampleResult>;
}

export interface PlatformSession<S extends Sampling = Sampling> {
  startState: DeviceState;
  readToolVersions: () => Promise<ToolVersions>;
  buildVariant: (request: BuildRequest) => Promise<BuiltVariant>;
  install: (variant: BuiltVariant) => Promise<void>;
  checkInstalled: (applicationId: string) => Promise<void>;
  cleanUp: (
    applicationIds: readonly string[],
    log: (message: string) => void
  ) => Promise<void>;
  stateChanges: (
    stored: DeviceState,
    comparesBatteryLevel: boolean
  ) => string[];
  sampling: (reference: SamplingReference) => S;
}

export interface Platform<S extends Sampling = Sampling> {
  name: PlatformName;
  traceExtension: string;
  connect: (
    processes: Processes,
    deviceId: string,
    options: PlatformOptions
  ) => Promise<PlatformSession<S>>;
}

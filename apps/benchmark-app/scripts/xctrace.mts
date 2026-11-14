import fs from 'node:fs';

import type { Processes } from './tools.mts';
import { computeIosTraceMetrics } from './xctrace-metrics.mts';
import type {
  IosTraceReading,
  TraceExports,
  TracedIosApp,
} from './xctrace-metrics.mts';

export interface IosTracer {
  record: (deviceName: string, pid: number, traceFile: string) => Promise<void>;
  collect: (traceFile: string, app: TracedIosApp) => Promise<IosTraceReading>;
}

export const TRACE_TEMPLATE = 'Animation Hitches';
export const TRACE_DURATION_SECONDS = 10;
export const TRACED_SUBSYSTEMS = [
  'dev.reactnative.instruments',
  'com.reanimatedbenchmark',
];
export const RECORD_TIMEOUT_MS = 5 * 60_000;
export const EXPORT_TIMEOUT_MS = 5 * 60_000;

const TABLE_SELECTORS: Record<keyof TraceExports, string> = {
  threadState: '@schema="thread-state"',
  frames: '@schema="hitches-updates"',
  hitches: '@schema="hitches"',
  thermal: '@schema="device-thermal-state-intervals"',
  signposts: '@schema="os-signpost" and @dynamic-tracing-enabled-subsystems',
};

export class Xctrace implements IosTracer {
  readonly #processes: Processes;

  constructor(processes: Processes) {
    this.#processes = processes;
  }

  async record(deviceName: string, pid: number, traceFile: string) {
    const optionsFile = `${traceFile}.options.json`;
    fs.rmSync(traceFile, { recursive: true, force: true });
    fs.writeFileSync(optionsFile, recordingOptions());
    try {
      await this.#processes.run(
        'xcrun',
        recordArguments(deviceName, pid, traceFile, optionsFile),
        { timeoutMs: RECORD_TIMEOUT_MS }
      );
    } finally {
      fs.rmSync(optionsFile, { force: true });
    }
  }

  async collect(
    traceFile: string,
    app: TracedIosApp
  ): Promise<IosTraceReading> {
    const exports: TraceExports = {
      threadState: await this.#export(traceFile, 'threadState'),
      frames: await this.#export(traceFile, 'frames'),
      hitches: await this.#export(traceFile, 'hitches'),
      thermal: await this.#export(traceFile, 'thermal'),
      signposts: await this.#export(traceFile, 'signposts'),
    };
    return computeIosTraceMetrics(exports, app);
  }

  async #export(traceFile: string, table: keyof TraceExports): Promise<string> {
    return (
      await this.#processes.run(
        'xcrun',
        [
          'xctrace',
          'export',
          '--input',
          traceFile,
          '--xpath',
          tableXpath(table),
        ],
        { timeoutMs: EXPORT_TIMEOUT_MS }
      )
    ).stdout;
  }
}

export function recordArguments(
  deviceName: string,
  pid: number,
  traceFile: string,
  optionsFile: string
): string[] {
  return [
    'xctrace',
    'record',
    '--device',
    deviceName,
    '--template',
    TRACE_TEMPLATE,
    '--instrument',
    'os_signpost',
    '--recording-options',
    optionsFile,
    '--attach',
    String(pid),
    '--time-limit',
    `${TRACE_DURATION_SECONDS}s`,
    '--output',
    traceFile,
    '--no-prompt',
  ];
}

export function recordingOptions(): string {
  return JSON.stringify({
    os_signpost: {
      dynamicTracingEnabledSubsystems: TRACED_SUBSYSTEMS,
      recordAllProcessesInSingleProcessMode: false,
    },
  });
}

export function tableXpath(table: keyof TraceExports): string {
  return `/trace-toc/run[@number="1"]/data/table[${TABLE_SELECTORS[table]}][1]`;
}

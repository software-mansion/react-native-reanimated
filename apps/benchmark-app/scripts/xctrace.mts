import fs from 'node:fs';

import { ToolError } from './errors.mts';
import type { Processes } from './processes.mts';
import type { TraceExports } from './xctrace-metrics.mts';

export interface TraceRecording {
  udid: string;
  pid: number;
  traceFile: string;
  seconds: number;
  onRecording: () => Promise<void>;
}

export interface IosTracer {
  record: (recording: TraceRecording) => Promise<void>;
  collect: (traceFile: string) => Promise<TraceExports>;
}

const INSTRUMENTS = ['Thread Activity', 'Hitches', 'os_signpost'];

const TRACED_SUBSYSTEMS = [
  'dev.reactnative.instruments',
  'com.reanimatedbenchmark',
];

const RECORDING_LINE = 'Ctrl-C to stop the recording';

const RECORD_TIMEOUT_MS = 5 * 60_000;

const EXPORT_TIMEOUT_MS = 5 * 60_000;

const TABLE_SELECTORS: Record<keyof TraceExports, string> = {
  threadState: '@schema="thread-state"',
  frames: '@schema="hitches-updates"',
  signposts: '@schema="os-signpost" and @dynamic-tracing-enabled-subsystems',
};

export class Xctrace implements IosTracer {
  readonly #processes: Processes;

  constructor(processes: Processes) {
    this.#processes = processes;
  }

  async record({ udid, pid, traceFile, seconds, onRecording }: TraceRecording) {
    const optionsFile = `${traceFile}.options.json`;
    fs.rmSync(traceFile, { recursive: true, force: true });
    fs.writeFileSync(optionsFile, recordingOptions());
    const recording: { started: Promise<Error | null> | null } = {
      started: null,
    };
    try {
      await this.#processes.run(
        'xcrun',
        recordArguments(udid, pid, traceFile, optionsFile, seconds),
        {
          timeoutMs: RECORD_TIMEOUT_MS,
          onLine: (line) => {
            if (line.includes(RECORDING_LINE)) {
              recording.started ??= onRecording().then(
                () => null,
                (error: Error) => error
              );
            }
          },
        }
      );
    } finally {
      fs.rmSync(optionsFile, { force: true });
    }
    if (recording.started === null) {
      throw new ToolError(
        `xctrace ended without the line "${RECORDING_LINE}" that marks the start of the recording`
      );
    }
    const failure = await recording.started;
    if (failure !== null) {
      throw failure;
    }
  }

  async collect(traceFile: string): Promise<TraceExports> {
    return {
      threadState: await this.#export(traceFile, 'threadState'),
      frames: await this.#export(traceFile, 'frames'),
      signposts: await this.#export(traceFile, 'signposts'),
    };
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

function recordingOptions(): string {
  return JSON.stringify({
    os_signpost: {
      dynamicTracingEnabledSubsystems: TRACED_SUBSYSTEMS,
      recordAllProcessesInSingleProcessMode: false,
    },
  });
}

function recordArguments(
  udid: string,
  pid: number,
  traceFile: string,
  optionsFile: string,
  seconds: number
): string[] {
  return [
    'xctrace',
    'record',
    '--device',
    udid,
    ...INSTRUMENTS.flatMap((instrument) => ['--instrument', instrument]),
    '--recording-options',
    optionsFile,
    '--attach',
    String(pid),
    '--time-limit',
    `${seconds}s`,
    '--output',
    traceFile,
    '--no-prompt',
  ];
}

function tableXpath(table: keyof TraceExports): string {
  return `/trace-toc/run[@number="1"]/data/table[${TABLE_SELECTORS[table]}][1]`;
}

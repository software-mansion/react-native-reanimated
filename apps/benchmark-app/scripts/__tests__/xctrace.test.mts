import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { ToolError } from '../errors.mts';
import { REPOSITORY_ROOT } from '../paths.mts';
import type { ProcessOptions, Processes } from '../processes.mts';
import { Xctrace } from '../xctrace.mts';

const ROOT = path.join(
  REPOSITORY_ROOT,
  '.tmp',
  'benchmarks',
  'tests',
  `xctrace-${process.pid}`
);
const TRACE = path.join(ROOT, 'a.trace');
const STARTED_OUTPUT = [
  'Starting recording with the Thread Activity, Hitches and os_signpost Instruments. Attaching to: 812. Time limit: 11.0 s',
  'Ctrl-C to stop the recording',
  'Reached specified time limit, ending recording...',
];

before(() => fs.mkdirSync(ROOT, { recursive: true }));
after(() => fs.rmSync(ROOT, { recursive: true, force: true }));

function fakeProcesses(
  onRun: (args: string[]) => { stdout: string; lines?: string[] } = () => ({
    stdout: '',
    lines: STARTED_OUTPUT,
  })
) {
  const calls: string[][] = [];
  const processes = {
    run: async (_command: string, args: string[], options: ProcessOptions) => {
      calls.push(args);
      const { stdout, lines = [] } = onRun(args);
      lines.forEach((line) => options.onLine?.(line));
      return { stdout, stderr: '' };
    },
  } as unknown as Processes;
  return { processes, calls };
}

function recording(onRecording: () => Promise<void> = async () => {}) {
  return {
    udid: 'UDID1',
    pid: 812,
    traceFile: TRACE,
    seconds: 11,
    onRecording,
  };
}

describe('Xctrace.record', () => {
  it('attaches the instruments of the cross-check to the process and calls back when the recording starts', async () => {
    let options: unknown = null;
    let started = 0;
    const { processes, calls } = fakeProcesses((args) => {
      options = JSON.parse(
        fs.readFileSync(args[args.indexOf('--recording-options') + 1], 'utf8')
      );
      return { stdout: '', lines: STARTED_OUTPUT };
    });
    await new Xctrace(processes).record(
      recording(async () => {
        started++;
      })
    );
    assert.deepEqual(calls, [
      [
        'xctrace',
        'record',
        '--device',
        'UDID1',
        '--instrument',
        'Thread Activity',
        '--instrument',
        'Hitches',
        '--instrument',
        'os_signpost',
        '--instrument',
        'Activity Monitor',
        '--recording-options',
        `${TRACE}.options.json`,
        '--attach',
        '812',
        '--time-limit',
        '11s',
        '--output',
        TRACE,
        '--no-prompt',
      ],
    ]);
    assert.deepEqual(options, {
      os_signpost: {
        dynamicTracingEnabledSubsystems: [
          'dev.reactnative.instruments',
          'com.reanimatedbenchmark',
        ],
        recordAllProcessesInSingleProcessMode: false,
      },
    });
    assert.equal(started, 1);
    assert.equal(fs.existsSync(`${TRACE}.options.json`), false);
  });

  it('is a tool error when xctrace gives no start line or the callback fails', async () => {
    await assert.rejects(
      new Xctrace(fakeProcesses(() => ({ stdout: '' })).processes).record(
        recording()
      ),
      /xctrace ended without the line "Ctrl-C to stop the recording"/
    );
    await assert.rejects(
      new Xctrace(fakeProcesses().processes).record(
        recording(async () => {
          throw new ToolError('devicectl failed');
        })
      ),
      /devicectl failed/
    );
  });
});

describe('Xctrace.collect', () => {
  it('exports one table of the first run for each table that the cross-check reads', async () => {
    const { processes, calls } = fakeProcesses(() => ({ stdout: '<xml/>' }));
    assert.deepEqual(await new Xctrace(processes).collect('/runs/a.trace'), {
      threadState: '<xml/>',
      frames: '<xml/>',
      signposts: '<xml/>',
      processes: '<xml/>',
    });
    assert.deepEqual(
      calls.map((args) => args.slice(0, 4)),
      calls.map(() => ['xctrace', 'export', '--input', '/runs/a.trace'])
    );
    assert.deepEqual(
      calls.map((args) => args.slice(4)),
      [
        '@schema="thread-state"',
        '@schema="hitches-updates"',
        '@schema="os-signpost" and @dynamic-tracing-enabled-subsystems',
        '@schema="activity-monitor-process-live"',
      ].map((selector) => [
        '--xpath',
        `/trace-toc/run[@number="1"]/data/table[${selector}][1]`,
      ])
    );
  });
});

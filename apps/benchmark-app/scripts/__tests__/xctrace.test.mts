import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { REPOSITORY_ROOT } from '../paths.mts';
import type { Processes } from '../processes.mts';
import { Xctrace } from '../xctrace.mts';

const APP = {
  pid: 812,
  mainThread: 5001,
  jsThread: 5002,
  frames: { refreshRate: 60, share: 1 },
  recordingSeconds: 10,
};

const ROOT = path.join(
  REPOSITORY_ROOT,
  '.tmp',
  'benchmarks',
  'tests',
  `xctrace-${process.pid}`
);
const TRACE = path.join(ROOT, 'a.trace');

before(() => fs.mkdirSync(ROOT, { recursive: true }));
after(() => fs.rmSync(ROOT, { recursive: true, force: true }));

function fakeProcesses(onRun: (args: string[]) => string = () => '') {
  const calls: string[][] = [];
  const processes = {
    run: async (_command: string, args: string[]) => {
      calls.push(args);
      return { stdout: onRun(args), stderr: '' };
    },
  } as unknown as Processes;
  return { processes, calls };
}

describe('Xctrace.record', () => {
  it('attaches to the process on the device with the hitches template and the signposts of React Native and of the app', async () => {
    let options: unknown = null;
    const { processes, calls } = fakeProcesses((args) => {
      options = JSON.parse(
        fs.readFileSync(args[args.indexOf('--recording-options') + 1], 'utf8')
      );
      return '';
    });
    await new Xctrace(processes).record('Test iPhone', 812, TRACE);
    assert.deepEqual(calls, [
      [
        'xctrace',
        'record',
        '--device',
        'Test iPhone',
        '--template',
        'Animation Hitches',
        '--instrument',
        'os_signpost',
        '--recording-options',
        `${TRACE}.options.json`,
        '--attach',
        '812',
        '--time-limit',
        '10s',
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
    assert.equal(fs.existsSync(`${TRACE}.options.json`), false);
  });
});

describe('Xctrace.collect', () => {
  it('exports one table of the first run for each table that the metrics read', async () => {
    const { processes, calls } = fakeProcesses(
      () => '<?xml version="1.0"?>\n<trace-query-result></trace-query-result>\n'
    );
    await assert.rejects(
      new Xctrace(processes).collect('/runs/a.trace', APP),
      /The xctrace export has no table thread-state/
    );
    assert.deepEqual(
      calls.map((args) => args.slice(0, 4)),
      calls.map(() => ['xctrace', 'export', '--input', '/runs/a.trace'])
    );
    assert.deepEqual(
      calls.map((args) => args.slice(4)),
      [
        '@schema="thread-state"',
        '@schema="hitches-updates"',
        '@schema="hitches"',
        '@schema="device-thermal-state-intervals"',
        '@schema="os-signpost" and @dynamic-tracing-enabled-subsystems',
      ].map((selector) => [
        '--xpath',
        `/trace-toc/run[@number="1"]/data/table[${selector}][1]`,
      ])
    );
  });
});

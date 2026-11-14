import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { parseArguments } from '../arguments.mts';
import { DEFAULT_OUTPUT_DIR, VALIDATION_DIR } from '../paths.mts';

describe('parseArguments', () => {
  it('reads the run command with defaults', () => {
    assert.deepEqual(
      parseArguments(['run', '--config', 'c.json', '--serial', 'S1']),
      {
        command: 'run',
        config: 'c.json',
        device: { platform: 'android', id: 'S1' },
        outputDir: DEFAULT_OUTPUT_DIR,
        blocks: 5,
        noiseLimits: undefined,
        keepTraces: false,
        traceProcessor: undefined,
        signCommand: undefined,
        validation: undefined,
      }
    );
  });

  it('reads all run options', () => {
    const command = parseArguments([
      'run',
      '--config',
      'c.json',
      '--serial',
      'S1',
      '--blocks',
      '3',
      '--noise-limits',
      'n.json',
      '--keep-traces',
      '--trace-processor',
      '/tp',
      '--output-dir',
      'out',
    ]);
    assert.deepEqual(command, {
      command: 'run',
      config: 'c.json',
      device: { platform: 'android', id: 'S1' },
      outputDir: path.join(process.cwd(), 'out'),
      blocks: 3,
      noiseLimits: 'n.json',
      keepTraces: true,
      traceProcessor: '/tp',
      signCommand: undefined,
      validation: undefined,
    });
  });

  it('reads the sample command', () => {
    assert.deepEqual(
      parseArguments([
        'sample',
        '--serial',
        'S1',
        '--package',
        'com.x',
        '--scenario',
        'css',
        '--load',
        '40',
        '--keep-trace',
      ]),
      {
        command: 'sample',
        device: { platform: 'android', id: 'S1' },
        applicationId: 'com.x',
        scenario: 'css',
        load: 40,
        keepTrace: true,
        traceProcessor: undefined,
      }
    );
  });

  it('rejects missing, unknown and malformed options', () => {
    assert.throws(
      () => parseArguments(['run', '--serial', 'S1']),
      /--config is required/
    );
    assert.throws(
      () =>
        parseArguments([
          'run',
          '--config',
          'c',
          '--serial',
          'S',
          '--load',
          '1',
        ]),
      /Unknown option '--load'/
    );
    assert.throws(
      () =>
        parseArguments([
          'run',
          '--config',
          'c',
          '--serial',
          'S',
          '--blocks',
          '0',
        ]),
      /positive integer/
    );
    assert.throws(
      () =>
        parseArguments([
          'sample',
          '--serial',
          'S',
          '--package',
          'p',
          '--scenario',
          'nope',
        ]),
      /Unknown scenario/
    );
    assert.throws(
      () => parseArguments(['measure']),
      /Unknown command "measure"/
    );
  });

  it('reads run --resume', () => {
    assert.deepEqual(
      parseArguments(['run', '--resume', 'runs/r1', '--serial', 'S1']),
      {
        command: 'resume',
        folder: 'runs/r1',
        device: { platform: 'android', id: 'S1' },
        traceProcessor: undefined,
      }
    );
  });

  it('rejects the stored options with --resume', () => {
    assert.throws(
      () =>
        parseArguments([
          'run',
          '--resume',
          'runs/r1',
          '--serial',
          'S1',
          '--blocks',
          '3',
          '--keep-traces',
        ]),
      /Remove --blocks, --keep-traces/
    );
    assert.throws(
      () => parseArguments(['run', '--resume', 'runs/r1']),
      /--serial is required/
    );
  });

  it('reads the memory command with defaults and with all options', () => {
    const required = [
      'memory',
      '--config',
      'c.json',
      '--scenario',
      'shared-elements',
      '--serial',
      'S1',
    ];
    assert.deepEqual(parseArguments(required), {
      command: 'memory',
      config: 'c.json',
      device: { platform: 'android', id: 'S1' },
      outputDir: DEFAULT_OUTPUT_DIR,
      scenario: 'shared-elements',
      launches: 2,
      intervalSeconds: 60,
      durationSeconds: 1200,
      slopeLimit: 1000,
      keepTraces: false,
      traceProcessor: undefined,
    });
    assert.deepEqual(
      parseArguments([
        ...required,
        '--launches',
        '4',
        '--interval',
        '30',
        '--duration',
        '600',
        '--slope-limit',
        '250.5',
        '--keep-traces',
        '--output-dir',
        '/out',
      ]),
      {
        command: 'memory',
        config: 'c.json',
        device: { platform: 'android', id: 'S1' },
        outputDir: '/out',
        scenario: 'shared-elements',
        launches: 4,
        intervalSeconds: 30,
        durationSeconds: 600,
        slopeLimit: 250.5,
        keepTraces: true,
        traceProcessor: undefined,
      }
    );
  });

  it('accepts an odd number of launches and rejects memory options that the test cannot use', () => {
    const required = [
      'memory',
      '--config',
      'c.json',
      '--scenario',
      'css',
      '--serial',
      'S1',
    ];
    assert.equal(
      (parseArguments([...required, '--launches', '3']) as { launches: number })
        .launches,
      3
    );
    assert.throws(
      () => parseArguments([...required, '--duration', '120']),
      /at least 4 times --interval/
    );
    assert.throws(
      () => parseArguments([...required, '--slope-limit=-1']),
      /--slope-limit must be a number of 0 or more/
    );
    assert.throws(
      () => parseArguments([...required, '--slope-limit', 'many']),
      /--slope-limit must be a number of 0 or more/
    );
    assert.throws(
      () => parseArguments(['memory', '--config', 'c.json', '--serial', 'S1']),
      /--scenario is required/
    );
  });

  it('reads memory --resume and rejects the stored options with it', () => {
    assert.deepEqual(
      parseArguments(['memory', '--resume', 'runs/m1', '--serial', 'S1']),
      {
        command: 'memory-resume',
        folder: 'runs/m1',
        device: { platform: 'android', id: 'S1' },
        traceProcessor: undefined,
      }
    );
    assert.throws(
      () =>
        parseArguments([
          'memory',
          '--resume',
          'runs/m1',
          '--serial',
          'S1',
          '--duration',
          '600',
        ]),
      /Remove --duration\./
    );
  });

  it('reads the noise-limits command with one or more runs', () => {
    assert.deepEqual(parseArguments(['noise-limits', '--runs', 'r1', 'r2']), {
      command: 'noise-limits',
      runs: ['r1', 'r2'],
    });
    assert.deepEqual(parseArguments(['noise-limits', '--runs', 'r1']), {
      command: 'noise-limits',
      runs: ['r1'],
    });
    assert.throws(
      () => parseArguments(['noise-limits', 'r1']),
      /--runs is required/
    );
  });

  it('reads an iOS device and resolves the sign command against the folder where the driver runs', () => {
    assert.deepEqual(
      parseArguments([
        'run',
        '--config',
        'c.json',
        '--udid',
        'U1',
        '--sign-command',
        './sign.sh',
      ]),
      {
        command: 'run',
        config: 'c.json',
        device: { platform: 'ios', id: 'U1' },
        outputDir: DEFAULT_OUTPUT_DIR,
        blocks: 5,
        noiseLimits: undefined,
        keepTraces: false,
        traceProcessor: undefined,
        signCommand: path.join(process.cwd(), 'sign.sh'),
        validation: undefined,
      }
    );
    assert.deepEqual(
      parseArguments(['run', '--resume', 'folder', '--udid', 'U1']),
      {
        command: 'resume',
        folder: 'folder',
        device: { platform: 'ios', id: 'U1' },
        traceProcessor: undefined,
      }
    );
    assert.deepEqual(
      parseArguments([
        'sample',
        '--udid',
        'U1',
        '--package',
        'com.x',
        '--scenario',
        'css',
      ]),
      {
        command: 'sample',
        device: { platform: 'ios', id: 'U1' },
        applicationId: 'com.x',
        scenario: 'css',
        load: undefined,
        keepTrace: false,
        traceProcessor: undefined,
      }
    );
  });

  it('rejects device options that do not fit the command', () => {
    assert.throws(
      () => parseArguments(['run', '--config', 'c.json', '--udid', 'U1']),
      /A run on ios needs --sign-command\./
    );
    assert.throws(
      () =>
        parseArguments([
          'run',
          '--config',
          'c.json',
          '--serial',
          'S1',
          '--sign-command',
          'x',
        ]),
      /--sign-command is not an option on android\./
    );
    assert.throws(
      () =>
        parseArguments([
          'run',
          '--config',
          'c.json',
          '--serial',
          'S1',
          '--udid',
          'U1',
        ]),
      /Give --serial or --udid, not the two together/
    );
    assert.throws(
      () =>
        parseArguments([
          'run',
          '--resume',
          'folder',
          '--udid',
          'U1',
          '--sign-command',
          'x',
        ]),
      /Remove --sign-command/
    );
    assert.throws(
      () =>
        parseArguments([
          'memory',
          '--config',
          'c.json',
          '--scenario',
          'css',
          '--udid',
          'U1',
        ]),
      /The memory command is not supported on ios\./
    );
    assert.throws(
      () => parseArguments(['memory', '--resume', 'folder', '--udid', 'U1']),
      /The memory command is not supported on ios\./
    );
    assert.throws(
      () =>
        parseArguments([
          'sample',
          '--udid',
          'U1',
          '--package',
          'com.x',
          '--scenario',
          'css',
          '--trace-processor',
          '/tp',
        ]),
      /--trace-processor is not an option on ios\./
    );
  });

  it('refuses the trace options of Android on iOS', () => {
    assert.throws(
      () =>
        parseArguments([
          'run',
          '--config',
          'c.json',
          '--udid',
          'U1',
          '--sign-command',
          './sign.sh',
          '--keep-traces',
        ]),
      /--keep-traces is not an option on ios\./
    );
    assert.throws(
      () =>
        parseArguments([
          'sample',
          '--udid',
          'U1',
          '--package',
          'com.x',
          '--scenario',
          'css',
          '--keep-trace',
        ]),
      /--keep-trace is not an option on ios\./
    );
  });

  it('reads the validation record of an iOS run and refuses it on Android', () => {
    const command = parseArguments([
      'run',
      '--config',
      'c.json',
      '--udid',
      'U1',
      '--sign-command',
      './sign.sh',
      '--validation',
      'validation.json',
    ]);
    assert.equal(
      command.command === 'run' ? command.validation : null,
      'validation.json'
    );
    assert.throws(
      () =>
        parseArguments([
          'run',
          '--config',
          'c.json',
          '--serial',
          'S1',
          '--validation',
          'validation.json',
        ]),
      /--validation is not an option on android\./
    );
  });

  it('reads the crosscheck command with a validation scenario and the epochs of the plan', () => {
    assert.deepEqual(
      parseArguments([
        'crosscheck',
        '--udid',
        'U1',
        '--package',
        'com.x',
        '--scenario',
        'crosscheck-load',
        '--epochs',
        'idle:full:2,ui-stall:endpoints:2.5',
      ]),
      {
        command: 'crosscheck',
        device: { platform: 'ios', id: 'U1' },
        applicationId: 'com.x',
        scenario: 'crosscheck-load',
        load: undefined,
        epochs: [
          { load: 'idle', collector: 'full', seconds: 2 },
          { load: 'ui-stall', collector: 'endpoints', seconds: 2.5 },
        ],
        outputDir: VALIDATION_DIR,
      }
    );
    for (const [epochs, problem] of [
      ['idle:half:2', /--epochs: The epoch "idle:half:2" is not/],
      ['idle:full:0', /--epochs: The epoch "idle:full:0" is not/],
      ['Idle:full:2', /--epochs: The epoch "Idle:full:2" is not/],
      ['idle:full:2:x', /--epochs: The epoch "idle:full:2:x" is not/],
    ] as const) {
      assert.throws(
        () =>
          parseArguments([
            'crosscheck',
            '--udid',
            'U1',
            '--package',
            'com.x',
            '--scenario',
            'css',
            '--epochs',
            epochs,
          ]),
        problem
      );
    }
    assert.throws(
      () =>
        parseArguments([
          'crosscheck',
          '--serial',
          'S1',
          '--package',
          'com.x',
          '--scenario',
          'css',
          '--epochs',
          'none:full:2',
        ]),
      /The crosscheck command is not supported on android\./
    );
  });

  it('reads the observer-cost command of a benchmark scenario', () => {
    assert.deepEqual(
      parseArguments([
        'observer-cost',
        '--udid',
        'U1',
        '--package',
        'com.x',
        '--scenario',
        'idle-cost',
        '--noise-limits',
        'limits.json',
      ]),
      {
        command: 'observer-cost',
        device: { platform: 'ios', id: 'U1' },
        applicationId: 'com.x',
        scenario: 'idle-cost',
        load: undefined,
        blocks: 5,
        noiseLimits: 'limits.json',
        outputDir: VALIDATION_DIR,
      }
    );
    assert.throws(
      () =>
        parseArguments([
          'observer-cost',
          '--udid',
          'U1',
          '--package',
          'com.x',
          '--scenario',
          'crosscheck-load',
        ]),
      /Unknown scenario "crosscheck-load"/
    );
    assert.throws(
      () =>
        parseArguments([
          'observer-cost',
          '--udid',
          'U1',
          '--package',
          'com.x',
          '--scenario',
          'idle-cost',
          '--blocks',
          '4',
        ]),
      /--blocks must be at least 5 for the observer-cost command, not 4/
    );
  });

  it('reads the validation-record command with its sources', () => {
    assert.deepEqual(
      parseArguments([
        'validation-record',
        '--crosscheck',
        'c1',
        '--crosscheck',
        'c2',
        '--observer-cost',
        'o1',
      ]),
      {
        command: 'validation-record',
        crosschecks: ['c1', 'c2'],
        observerCosts: ['o1'],
        earlierCrosschecks: [],
      }
    );
    assert.deepEqual(
      parseArguments([
        'validation-record',
        '--crosscheck',
        'c1',
        '--observer-cost',
        'o1',
        '--earlier-crosscheck',
        'e1',
      ]),
      {
        command: 'validation-record',
        crosschecks: ['c1'],
        observerCosts: ['o1'],
        earlierCrosschecks: ['e1'],
      }
    );
    assert.throws(
      () => parseArguments(['validation-record', '--crosscheck', 'c1']),
      /--observer-cost is required/
    );
  });

  it('gives help with no command', () => {
    assert.deepEqual(parseArguments([]), { command: 'help' });
  });
});

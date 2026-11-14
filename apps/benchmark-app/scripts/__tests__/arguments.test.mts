import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { parseArguments } from '../arguments.mts';

describe('parseArguments', () => {
  it('reads the run command with defaults', () => {
    assert.deepEqual(
      parseArguments(['run', '--config', 'c.json', '--serial', 'S1']),
      {
        command: 'run',
        config: 'c.json',
        device: { platform: 'android', id: 'S1' },
        blocks: 5,
        noiseLimits: undefined,
        keepTraces: false,
        traceProcessor: undefined,
        signCommand: undefined,
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
    ]);
    assert.deepEqual(command, {
      command: 'run',
      config: 'c.json',
      device: { platform: 'android', id: 'S1' },
      blocks: 3,
      noiseLimits: 'n.json',
      keepTraces: true,
      traceProcessor: '/tp',
      signCommand: undefined,
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
      ]),
      {
        command: 'memory',
        config: 'c.json',
        device: { platform: 'android', id: 'S1' },
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
        blocks: 5,
        noiseLimits: undefined,
        keepTraces: false,
        traceProcessor: undefined,
        signCommand: path.join(process.cwd(), 'sign.sh'),
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

  it('gives help with no command', () => {
    assert.deepEqual(parseArguments([]), { command: 'help' });
  });
});

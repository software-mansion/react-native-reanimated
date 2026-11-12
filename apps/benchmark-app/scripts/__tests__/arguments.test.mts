import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseArguments } from '../arguments.mts';

describe('parseArguments', () => {
  it('reads the run command with defaults', () => {
    assert.deepEqual(
      parseArguments(['run', '--config', 'c.json', '--serial', 'S1']),
      {
        command: 'run',
        config: 'c.json',
        serial: 'S1',
        blocks: 5,
        noiseLimits: undefined,
        keepTraces: false,
        traceProcessor: undefined,
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
      serial: 'S1',
      blocks: 3,
      noiseLimits: 'n.json',
      keepTraces: true,
      traceProcessor: '/tp',
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
        serial: 'S1',
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
        serial: 'S1',
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

  it('gives help with no command', () => {
    assert.deepEqual(parseArguments([]), { command: 'help' });
  });
});

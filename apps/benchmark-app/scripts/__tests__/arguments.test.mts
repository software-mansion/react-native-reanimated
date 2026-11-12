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

  it('gives help with no command', () => {
    assert.deepEqual(parseArguments([]), { command: 'help' });
  });
});

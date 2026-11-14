import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { recordArguments, recordingOptions, tableXpath } from '../xctrace.mts';

describe('recordArguments', () => {
  it('attaches to the process on the device with the hitches template and signposts', () => {
    assert.deepEqual(
      recordArguments(
        'Test iPhone',
        812,
        '/runs/a.trace',
        '/runs/options.json'
      ),
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
        '/runs/options.json',
        '--attach',
        '812',
        '--time-limit',
        '10s',
        '--output',
        '/runs/a.trace',
        '--no-prompt',
      ]
    );
  });
});

describe('recordingOptions', () => {
  it('turns on the signposts of React Native and of the app', () => {
    assert.deepEqual(JSON.parse(recordingOptions()), {
      os_signpost: {
        dynamicTracingEnabledSubsystems: [
          'dev.reactnative.instruments',
          'com.reanimatedbenchmark',
        ],
        recordAllProcessesInSingleProcessMode: false,
      },
    });
  });
});

describe('tableXpath', () => {
  it('selects one table of the first run', () => {
    assert.equal(
      tableXpath('threadState'),
      '/trace-toc/run[@number="1"]/data/table[@schema="thread-state"][1]'
    );
    assert.equal(
      tableXpath('signposts'),
      '/trace-toc/run[@number="1"]/data/table[@schema="os-signpost" and @dynamic-tracing-enabled-subsystems][1]'
    );
  });
});

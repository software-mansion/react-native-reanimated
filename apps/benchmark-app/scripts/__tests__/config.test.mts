import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ANDROID_DEFINITION } from '../android-definition.mts';
import { blocksOf, validateConfig } from '../config.mts';
import { IOS_DEFINITION } from '../ios-definition.mts';

const CONFIG_DIR = '/configs';
const TARBALL = '/configs/tarballs/react-native-reanimated-4.8.0.tgz';
const files = { isFile: (file: string) => file === TARBALL };

function config(overrides: Record<string, unknown> = {}) {
  return {
    name: 'android-sync-ui-props',
    a: {
      reanimated: '4.7.1',
      worklets: '0.13.1',
      reanimatedFlags: { ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: false },
    },
    b: {
      reanimated: 'tarballs/react-native-reanimated-4.8.0.tgz',
      worklets: '0.13.1',
    },
    scenarios: ['worklet-styles-transform', 'css'],
    ...overrides,
  };
}

function validated(raw: unknown, definition = ANDROID_DEFINITION) {
  return validateConfig(raw, CONFIG_DIR, files, definition);
}

function problemsOf(raw: unknown, definition = ANDROID_DEFINITION): string {
  try {
    validated(raw, definition);
  } catch (error) {
    return (error as Error).message;
  }
  assert.fail('expected the config to be rejected');
}

describe('validateConfig', () => {
  it('reads a valid config and fills the defaults', () => {
    const result = validated(config());
    assert.deepEqual(result.a, {
      reanimated: { kind: 'npm', version: '4.7.1' },
      worklets: { kind: 'npm', version: '0.13.1' },
      reanimatedFlags: { ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: false },
      workletsFlags: {},
      bundleMode: false,
      profiling: false,
    });
    assert.deepEqual(result.b.reanimated, { kind: 'tarball', path: TARBALL });
    assert.deepEqual(result.expect, [
      {
        scenarios: ['worklet-styles-transform', 'css'],
        metrics: [...ANDROID_DEFINITION.verdictMetrics],
        is: 'notWorse',
      },
    ]);
  });

  it('selects the verdict metrics of the platform by default', () => {
    assert.deepEqual(validated(config(), IOS_DEFINITION).expect[0].metrics, [
      ...IOS_DEFINITION.verdictMetrics,
    ]);
    assert.ok(!IOS_DEFINITION.verdictMetrics.includes('coldStart'));
  });

  it('reads expectations with default selections', () => {
    const result = validated(
      config({
        expect: [
          {
            scenarios: ['worklet-styles-transform'],
            metrics: ['uiThreadCpu'],
            is: 'better',
            byAtLeast: 0.1,
          },
          { is: 'notWorse' },
        ],
      })
    );
    assert.deepEqual(result.expect[0], {
      scenarios: ['worklet-styles-transform'],
      metrics: ['uiThreadCpu'],
      is: 'better',
      byAtLeast: 0.1,
    });
    assert.deepEqual(result.expect[1].scenarios, [
      'worklet-styles-transform',
      'css',
    ]);
  });

  it('lists all problems at once', () => {
    const message = problemsOf(
      config({
        extra: 1,
        scenarios: ['css', 'nope'],
        a: {
          reanimated: 'latest',
          worklets: 'missing.tgz',
          bundleMode: true,
          other: 1,
        },
        expect: [{ metrics: ['fps'], is: 'notWorse', byAtLeast: 0.1 }],
      })
    );
    for (const expected of [
      'config: unknown field "extra"',
      'unknown scenario "nope"',
      'config.a: unknown field "other"',
      'config.a.reanimated must be an exact npm version',
      'config.a.worklets: no file at /configs/missing.tgz',
      'config.a.bundleMode: true is not supported',
      'config.expect[0].metrics: unknown name "fps"',
      'config.expect[0].byAtLeast is allowed only with "is": "better"',
    ]) {
      assert.ok(
        message.includes(expected),
        `missing "${expected}" in:\n${message}`
      );
    }
  });

  it('rejects an expectation scenario that the run does not measure', () => {
    assert.match(
      problemsOf(
        config({ expect: [{ scenarios: ['idle-cost'], is: 'notWorse' }] })
      ),
      /unknown name "idle-cost"/
    );
  });

  it('rejects an expectation of a metric without a verdict on the platform', () => {
    for (const [metric, definition] of [
      ['windowMemoryDelta', ANDROID_DEFINITION],
      ['coldStart', IOS_DEFINITION],
    ] as const) {
      assert.match(
        problemsOf(
          config({
            expect: [{ scenarios: ['css'], metrics: [metric], is: 'notWorse' }],
          }),
          definition
        ),
        new RegExp(`unknown name "${metric}"`)
      );
    }
  });

  it('rejects flags that are not booleans', () => {
    assert.match(
      problemsOf(
        config({
          b: {
            reanimated: '4.7.1',
            worklets: '0.13.1',
            workletsFlags: { lower: true, OK_FLAG: 1 },
          },
        })
      ),
      /config\.b\.workletsFlags\.lower must be/
    );
  });

  it('rejects a byAtLeast outside 0 to 1', () => {
    assert.match(
      problemsOf(config({ expect: [{ is: 'better', byAtLeast: 2 }] })),
      /must be a fraction/
    );
  });
});

describe('config blocks', () => {
  it('reads a block count for a scenario of the run', () => {
    const result = validated(config({ blocks: { css: 10 } }));
    assert.deepEqual(result.blocks, { css: 10 });
    assert.equal(blocksOf(result, 'css', 5), 10);
    assert.equal(blocksOf(result, 'worklet-styles-transform', 5), 5);
    assert.equal(validated(config()).blocks, undefined);
  });

  it('rejects a scenario that the run does not measure and a count that is not a positive integer', () => {
    const message = problemsOf(
      config({
        blocks: { 'idle-cost': 3, css: 0, 'worklet-styles-transform': 2.5 },
      })
    );
    for (const expected of [
      'config.blocks: "idle-cost" is not a scenario of this run',
      'config.blocks.css must be a positive integer',
      'config.blocks.worklet-styles-transform must be a positive integer',
    ]) {
      assert.ok(
        message.includes(expected),
        `missing "${expected}" in:\n${message}`
      );
    }
  });
});

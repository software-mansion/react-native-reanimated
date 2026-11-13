import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { blocksOf, validateConfig, validateNoiseLimits } from '../config.mts';
import { VERDICT_METRICS } from '../metrics.mts';

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

function problemsOf(raw: unknown): string {
  try {
    validateConfig(raw, CONFIG_DIR, files);
  } catch (error) {
    return (error as Error).message;
  }
  assert.fail('expected the config to be rejected');
}

describe('validateConfig', () => {
  it('reads a valid config and fills the defaults', () => {
    const result = validateConfig(config(), CONFIG_DIR, files);
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
        metrics: [...VERDICT_METRICS],
        is: 'notWorse',
      },
    ]);
  });

  it('reads expectations with default selections', () => {
    const result = validateConfig(
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
      }),
      CONFIG_DIR,
      files
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

  it('rejects an expectation of a metric without a verdict', () => {
    for (const metric of ['memoryGrowth', 'windowMemoryDelta']) {
      assert.match(
        problemsOf(
          config({
            expect: [{ scenarios: ['css'], metrics: [metric], is: 'notWorse' }],
          })
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
    const result = validateConfig(
      config({ blocks: { css: 10 } }),
      CONFIG_DIR,
      files
    );
    assert.deepEqual(result.blocks, { css: 10 });
    assert.equal(blocksOf(result, 'css', 5), 10);
    assert.equal(blocksOf(result, 'worklet-styles-transform', 5), 5);
    assert.equal(validateConfig(config(), CONFIG_DIR, files).blocks, undefined);
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

describe('validateNoiseLimits', () => {
  it('reads valid limits', () => {
    assert.deepEqual(validateNoiseLimits({ css: { uiThreadCpu: 0.05 } }), {
      css: { uiThreadCpu: 0.05 },
    });
  });

  it('ignores the limits of the old metric memoryGrowth', () => {
    assert.deepEqual(
      validateNoiseLimits({
        'mount-unmount': { memory: 0.03, memoryGrowth: 4000 },
      }),
      { 'mount-unmount': { memory: 0.03 } }
    );
  });

  it('rejects windowMemoryDelta, which has no verdict', () => {
    assert.throws(
      () => validateNoiseLimits({ css: { windowMemoryDelta: 4000 } }),
      /unknown metric "windowMemoryDelta"/
    );
  });

  it('rejects unknown names and negative limits', () => {
    assert.throws(
      () => validateNoiseLimits({ nope: {}, css: { fps: 0.1, memory: -1 } }),
      (error: Error) =>
        error.message.includes('unknown scenario "nope"') &&
        error.message.includes('unknown metric "fps"') &&
        error.message.includes('css.memory must be a number of 0 or more')
    );
  });
});

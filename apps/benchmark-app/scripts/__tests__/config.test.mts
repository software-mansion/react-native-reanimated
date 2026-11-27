import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { ANDROID_DEFINITION } from '../android-definition.mts';
import { blocksOf, validateConfig } from '../config.mts';
import { IOS_DEFINITION } from '../ios-definition.mts';
import { REPOSITORY_ROOT } from '../paths.mts';

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

  it('rejects a byAtLeast for a metric with an absolute difference', () => {
    for (const expectation of [
      { metrics: ['jankyFrames'], is: 'better', byAtLeast: 0.02 },
      { is: 'better', byAtLeast: 0.02 },
    ]) {
      assert.match(
        problemsOf(config({ expect: [expectation] }), ANDROID_DEFINITION),
        /config\.expect\[0\]\.byAtLeast is a relative difference, and jankyFrames use an absolute difference/
      );
    }
  });
});

describe('scenario flags', () => {
  const flag = { ENABLE_SHARED_ELEMENT_TRANSITIONS: true };

  it('accepts a scenario whose flag both variants set to true', () => {
    const result = validated(
      config({
        a: { reanimated: '4.7.1', worklets: '0.13.1', reanimatedFlags: flag },
        b: {
          reanimated: 'tarballs/react-native-reanimated-4.8.0.tgz',
          worklets: '0.13.1',
          reanimatedFlags: flag,
        },
        scenarios: ['shared-elements', 'css'],
      })
    );
    assert.deepEqual(result.b.reanimatedFlags, flag);
  });

  it('refuses a scenario whose flag a variant does not set to true', () => {
    const message = problemsOf(
      config({
        a: {
          reanimated: '4.7.1',
          worklets: '0.13.1',
          reanimatedFlags: { ENABLE_SHARED_ELEMENT_TRANSITIONS: false },
        },
        b: {
          reanimated: 'tarballs/react-native-reanimated-4.8.0.tgz',
          worklets: '0.13.1',
        },
        scenarios: ['shared-elements'],
      })
    );
    for (const key of ['a', 'b']) {
      assert.ok(
        message.includes(
          `config.${key}.reanimatedFlags.ENABLE_SHARED_ELEMENT_TRANSITIONS must be true for the scenario shared-elements. The driver does not know the default of a flag in a library version, so set the flag in both variants.`
        ),
        message
      );
    }
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

  it('rejects more than 50 blocks', () => {
    assert.match(
      problemsOf(config({ blocks: { css: 51 } })),
      /config\.blocks\.css must be an integer from 1 to 50/
    );
    assert.deepEqual(validated(config({ blocks: { css: 50 } })).blocks, {
      css: 50,
    });
  });

  it('rejects a scenario that the run does not measure and a count that is not a positive integer', () => {
    const message = problemsOf(
      config({
        blocks: { 'idle-cost': 3, css: 0, 'worklet-styles-transform': 2.5 },
      })
    );
    for (const expected of [
      'config.blocks: "idle-cost" is not a scenario of this run',
      'config.blocks.css must be an integer from 1 to 50',
      'config.blocks.worklet-styles-transform must be an integer from 1 to 50',
    ]) {
      assert.ok(
        message.includes(expected),
        `missing "${expected}" in:\n${message}`
      );
    }
  });
});

describe('README configs', () => {
  const readme = fs.readFileSync(
    path.join(import.meta.dirname, '..', 'README.md'),
    'utf8'
  );
  const examples = [...readme.matchAll(/```json\n([\s\S]*?)\n```/g)].map(
    (match) =>
      JSON.parse(match[1]) as {
        name: string;
        a: { reanimated: string; worklets: string };
        b: { reanimated: string; worklets: string };
      }
  );

  it('are valid configs of their platform', () => {
    assert.deepEqual(
      examples.map((example) => example.name),
      ['sync-props', 'ios-css']
    );
    const everyFile = { isFile: () => true };
    validateConfig(examples[0], CONFIG_DIR, everyFile, ANDROID_DEFINITION);
    validateConfig(examples[1], CONFIG_DIR, everyFile, IOS_DEFINITION);
  });

  it('pair each Reanimated version with a Worklets version of compatibility.json', () => {
    const compatibility = JSON.parse(
      fs.readFileSync(
        path.join(
          REPOSITORY_ROOT,
          'packages',
          'react-native-reanimated',
          'compatibility.json'
        ),
        'utf8'
      )
    ) as { fabric: Record<string, { 'react-native-worklets': string[] }> };
    for (const example of examples) {
      for (const variant of [example.a, example.b]) {
        const reanimated = minorRange(variant.reanimated);
        const worklets = minorRange(variant.worklets);
        assert.ok(
          compatibility.fabric[reanimated]?.['react-native-worklets'].includes(
            worklets
          ),
          `${example.name}: Reanimated ${reanimated} with Worklets ${worklets}`
        );
      }
    }
  });
});

function minorRange(source: string): string {
  const version = /(\d+)\.(\d+)\.\d+(-[0-9A-Za-z.-]+)?(\.tgz)?$/.exec(source);
  assert.ok(version, source);
  return `${version[1]}.${version[2]}.x`;
}

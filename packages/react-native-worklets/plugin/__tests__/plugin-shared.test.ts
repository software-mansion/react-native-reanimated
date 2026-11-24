import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { strict as assert } from 'assert';
import { html } from 'code-tag';
import * as path from 'path';

type CapturedFile = { path: string; content: string };

const capturedFiles: CapturedFile[] = [];

// The Oxc transform writes its files from Rust, so they never reach the `fs`
// mock below. Its jest setup records them on `globalThis` instead.
function nativelyEmittedFiles(): CapturedFile[] {
  return ((
    globalThis as { __WORKLETS_OXC_EMITTED__?: CapturedFile[] }
  ).__WORKLETS_OXC_EMITTED__ ??= []);
}

function emittedFiles(): CapturedFile[] {
  return capturedFiles.length > 0 ? [...capturedFiles] : nativelyEmittedFiles();
}

jest.mock('fs', () => {
  const actual: object = jest.requireActual('fs');
  return {
    ...actual,
    writeFileSync: (filepath: string, content: string) => {
      capturedFiles.push({ path: String(filepath), content: String(content) });
    },
  };
});

// eslint-disable-next-line import/first
import type { PluginOptions } from '../index';
// eslint-disable-next-line import/first
import plugin from '../index';

const MOCK_LOCATION = 'test.js';

type RunResult = {
  code: string;
  files: CapturedFile[];
};

function runPlugin(
  input: string,
  pluginOpts: PluginOptions = {},
  transformOpts: TransformOptions = {}
): RunResult {
  capturedFiles.length = 0;
  nativelyEmittedFiles().length = 0;
  const strippedInput = input.replace(/<\/?script[^>]*>/g, '');
  const transformed = transformSync(strippedInput, {
    filename: MOCK_LOCATION,
    caller: { name: 'metro', bundler: 'metro' },
    compact: false,
    babelrc: false,
    configFile: false,
    ...transformOpts,
    plugins: [...(transformOpts.plugins ?? []), [plugin, pluginOpts]],
  });
  assert(transformed);
  return { code: transformed.code ?? '', files: emittedFiles() };
}

function workletText(result: RunResult): string {
  return result.files.map((f) => f.content).join('\n');
}

describe('babel plugin core', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
    capturedFiles.length = 0;
    nativelyEmittedFiles().length = 0;
  });

  describe('worklet shapes', () => {
    const cases: Array<{ name: string; input: string }> = [
      {
        name: 'FunctionDeclaration',
        input: html`<script>
          function foo(x) {
            'worklet';
            return x + 2;
          }
        </script>`,
      },
      {
        name: 'ArrowFunctionExpression',
        input: html`<script>
          const foo = (x) => {
            'worklet';
            return x + 2;
          };
        </script>`,
      },
      {
        name: 'unnamed FunctionExpression',
        input: html`<script>
          const foo = function (x) {
            'worklet';
            return x + 2;
          };
        </script>`,
      },
      {
        name: 'named FunctionExpression',
        input: html`<script>
          const foo = function foo(x) {
            'worklet';
            return x + 2;
          };
        </script>`,
      },
      {
        name: 'ObjectMethod',
        input: html`<script>
          const foo = {
            bar(x) {
              'worklet';
              return x + 2;
            },
          };
        </script>`,
      },
    ];

    test.each(cases)('workletizes $name', ({ input }) => {
      const result = runPlugin(input);
      expect(result.files).toHaveLength(1);
      expect(result.code).toMatchSnapshot();
      expect(result.files[0].content).toMatchSnapshot();
    });
  });

  describe('closure handling', () => {
    test('does not capture default globals', () => {
      const input = html`<script>
        function f() {
          'worklet';
          console.log('hi');
          return Math.random();
        }
      </script>`;

      const result = runPlugin(input);
      expect(workletText(result)).toMatchSnapshot();
    });

    test('does not capture navigator', () => {
      const input = html`<script>
        function f() {
          'worklet';
          return navigator.gpu;
        }
      </script>`;

      const result = runPlugin(input);
      expect(workletText(result)).toMatchSnapshot();
    });

    test('captures locally bound variables shadowing globals', () => {
      const input = html`<script>
        const console = {
          log: () => 42,
        };

        function f() {
          'worklet';
          console.log(console);
        }
      </script>`;

      const result = runPlugin(input);
      expect(workletText(result)).toMatchSnapshot();
    });

    test('captures multiple closure variables', () => {
      const input = html`<script>
        const a = 1;
        const b = 2;
        function foo() {
          'worklet';
          return a + b;
        }
      </script>`;

      const result = runPlugin(input);
      expect(workletText(result)).toMatchSnapshot();
    });

    test('allows assigning to a captured variable', () => {
      const input = html`<script>
        let x = 0;
        function foo() {
          'worklet';
          if (x > 1) {
            x = 0;
          }
        }
      </script>`;

      const result = runPlugin(input);
      expect(workletText(result)).toMatchSnapshot();
    });
  });

  describe('autoworkletization', () => {
    test('workletizes useAnimatedStyle callback', () => {
      const input = html`<script>
        import { useAnimatedStyle } from 'react-native-reanimated';
        function Box() {
          const style = useAnimatedStyle(() => ({ width: 100 }));
        }
      </script>`;

      const result = runPlugin(input);
      expect(result.code).toMatchSnapshot();
      expect(result.files[0].content).toMatchSnapshot();
    });
  });

  describe('autoworkletization of runtime APIs', () => {
    function factoryCount(input: string): number {
      const result = runPlugin(input);
      return result.files.length;
    }

    test.each([
      {
        name: 'runOnRuntimeAsyncWithId callback',
        input: html`<script>
          import { runOnRuntimeAsyncWithId } from 'react-native-worklets';
          runOnRuntimeAsyncWithId(1, () => 42);
        </script>`,
        expected: 1,
      },
      {
        name: 'createWorkletRuntime initializer arrow function',
        input: html`<script>
          import { createWorkletRuntime } from 'react-native-worklets';
          createWorkletRuntime({ name: 'rt', initializer: () => {} });
        </script>`,
        expected: 1,
      },
      {
        name: 'createWorkletRuntime initializer method',
        input: html`<script>
          import { createWorkletRuntime } from 'react-native-worklets';
          createWorkletRuntime({ initializer() {} });
        </script>`,
        expected: 1,
      },
      {
        name: 'createWorkletRuntime initializer with a string key',
        input: html`<script>
          import { createWorkletRuntime } from 'react-native-worklets';
          createWorkletRuntime({ 'initializer': function () {} });
        </script>`,
        expected: 1,
      },
      {
        name: 'createWorkletRuntime initializer referenced by name',
        input: html`<script>
          import { createWorkletRuntime } from 'react-native-worklets';
          const init = () => {};
          createWorkletRuntime({ initializer: init });
        </script>`,
        expected: 1,
      },
      {
        name: 'createWorkletRuntime initializer next to a spread',
        input: html`<script>
          import { createWorkletRuntime } from 'react-native-worklets';
          const base = { name: 'rt' };
          createWorkletRuntime({ ...base, initializer: () => {} });
        </script>`,
        expected: 1,
      },
      {
        name: 'deprecated createWorkletRuntime initializer argument',
        input: html`<script>
          import { createWorkletRuntime } from 'react-native-worklets';
          createWorkletRuntime('rt', () => {});
        </script>`,
        expected: 1,
      },
      {
        name: 'createShareable decorators',
        input: html`<script>
          import { createShareable } from 'react-native-worklets';
          createShareable(2, 0, {
            hostDecorator: (shareable) => shareable,
            guestDecorator(shareable) {
              return shareable;
            },
          });
        </script>`,
        expected: 2,
      },
      {
        name: 'registerCustomSerializable callbacks',
        input: html`<script>
          import { registerCustomSerializable } from 'react-native-worklets';
          registerCustomSerializable({
            name: 'Foo',
            determine: (value) => 'a' in value,
            pack: (value) => ({ a: value.a }),
            unpack(value) {
              return { a: value.a };
            },
          });
        </script>`,
        expected: 3,
      },
      {
        name: 'withTiming custom easing',
        input: html`<script>
          import { withTiming } from 'react-native-reanimated';
          withTiming(1, { duration: 300, easing: (t) => t * t });
        </script>`,
        expected: 1,
      },
      {
        name: 'withTiming custom easing referenced by name',
        input: html`<script>
          import { withTiming } from 'react-native-reanimated';
          const square = (t) => t * t;
          withTiming(1, { easing: square });
        </script>`,
        expected: 1,
      },
      {
        name: 'useHandler handlers',
        input: html`<script>
          import { useHandler } from 'react-native-reanimated';
          const base = {};
          useHandler({
            ...base,
            onScroll: (event) => event,
            onBeginDrag(event) {
              return event;
            },
          });
        </script>`,
        expected: 2,
      },
    ])('workletizes $name', ({ input, expected }) => {
      expect(factoryCount(input)).toBe(expected);
    });

    test.each([
      {
        name: 'other functions in the createWorkletRuntime config',
        input: html`<script>
          import { createWorkletRuntime } from 'react-native-worklets';
          createWorkletRuntime({ name: 'rt', other: () => {} });
        </script>`,
      },
      {
        name: 'a computed initializer key',
        input: html`<script>
          import { createWorkletRuntime } from 'react-native-worklets';
          const key = 'initializer';
          createWorkletRuntime({ [key]: () => {} });
        </script>`,
      },
      {
        name: 'other functions in the createShareable config',
        input: html`<script>
          import { createShareable } from 'react-native-worklets';
          createShareable(2, 0, { other: () => {} });
        </script>`,
      },
      {
        name: 'withTiming easing built by a call',
        input: html`<script>
          import { withTiming, Easing } from 'react-native-reanimated';
          withTiming(1, { easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
        </script>`,
      },
    ])('does not workletize $name', ({ input }) => {
      expect(factoryCount(input)).toBe(0);
    });

    test.each([
      {
        name: 'createWorkletRuntime initializer',
        input: html`<script>
          import { createWorkletRuntime } from 'react-native-worklets';
          createWorkletRuntime({ other: () => 1, initializer: () => 2 });
        </script>`,
      },
      {
        name: 'createShareable hostDecorator',
        input: html`<script>
          import { createShareable } from 'react-native-worklets';
          createShareable(2, 0, { other: () => 1, hostDecorator: () => 2 });
        </script>`,
      },
      {
        name: 'withTiming easing',
        input: html`<script>
          import { withTiming } from 'react-native-reanimated';
          withTiming(1, { other: () => 1, easing: () => 2 });
        </script>`,
      },
    ])('workletizes only the $name in the config', ({ input }) => {
      const output = workletText(runPlugin(input));
      expect(output).toContain('return 2');
      expect(output).not.toContain('return 1');
    });
  });

  describe('class methods', () => {
    test('workletizes an instance method with a worklet directive', () => {
      const input = html`<script>
        class Registry {
          notify(name) {
            'worklet';
            return name;
          }
        }
      </script>`;

      const result = runPlugin(input);
      expect(result.files).toHaveLength(1);
      expect(result.code).toContain('notify =');
      expect(workletText(result)).toContain('return name');
    });

    test('workletizes a static method with a worklet directive', () => {
      const input = html`<script>
        class Registry {
          static notify(name) {
            'worklet';
            return name;
          }
        }
      </script>`;

      const result = runPlugin(input);
      expect(result.files).toHaveLength(1);
      expect(result.code).toContain('static notify =');
    });

    test('does not workletize a method without a worklet directive', () => {
      const input = html`<script>
        class Registry {
          notify(name) {
            return name;
          }
        }
      </script>`;

      expect(runPlugin(input).files).toHaveLength(0);
    });

    test('does not workletize accessors and constructors', () => {
      const input = html`<script>
        class Registry {
          constructor() {
            'worklet';
          }
          get name() {
            'worklet';
            return 'registry';
          }
          set name(value) {
            'worklet';
          }
        }
      </script>`;

      expect(runPlugin(input).files).toHaveLength(0);
    });
  });

  describe('autoworkletization of shared transition callbacks', () => {
    function factoryCount(input: string): number {
      return runPlugin(input).files.length;
    }

    test.each([
      {
        name: 'withCallback on SharedTransition',
        input: html`<script>
          SharedTransition.withCallback((finished) => {});
        </script>`,
        expected: 1,
      },
      {
        name: 'withCallback after duration',
        input: html`<script>
          SharedTransition.duration(300).withCallback((finished) => {
            console.log(finished);
          });
        </script>`,
        expected: 1,
      },
      {
        name: 'withCallback after a spring config',
        input: html`<script>
          SharedTransition.springify(400)
            .dampingRatio(0.8)
            .reduceMotion(ReduceMotion.System)
            .withCallback((finished) => {});
        </script>`,
        expected: 1,
      },
      {
        name: 'withCallback after fadeContent',
        input: html`<script>
          SharedTransition.fadeContent({ fadeOut: { end: 0.5 } })
            .delay(100)
            .withCallback((finished) => {});
        </script>`,
        expected: 1,
      },
      {
        name: 'custom animation and withCallback',
        input: html`<script>
          SharedTransition.custom((values) => ({
            width: withTiming(values.targetWidth),
          }))
            .duration(800)
            .withCallback((finished) => {});
        </script>`,
        expected: 2,
      },
      {
        name: 'progress animation and withCallback',
        input: html`<script>
          SharedTransition.duration(800)
            .progressAnimation((values, progress) => ({ opacity: progress }))
            .defaultTransitionType(SharedTransitionType.PROGRESS_ANIMATION)
            .withCallback((finished) => {});
        </script>`,
        expected: 2,
      },
      {
        name: 'progress animation after withCallback',
        input: html`<script>
          SharedTransition.withCallback((finished) => {}).progressAnimation(
            (values, progress) => ({ opacity: progress })
          );
        </script>`,
        expected: 2,
      },
      {
        name: 'withCallback of FadeIn after the new chain methods',
        input: html`<script>
          FadeIn.withTargetValues({ opacity: 1 })
            .reduceMotion(ReduceMotion.System)
            .springify()
            .dampingRatio(0.8)
            .withCallback((finished) => {});
        </script>`,
        expected: 1,
      },
      {
        name: 'static progress animation',
        input: html`<script>
          SharedTransition.progressAnimation((values, progress) => ({
            opacity: progress,
          }));
        </script>`,
        expected: 1,
      },
    ])('workletizes $name', ({ input, expected }) => {
      expect(factoryCount(input)).toBe(expected);
    });

    test.each([
      {
        name: 'withCallback on an unknown object',
        input: html`<script>
          SharedTransitionHelper.duration(300).withCallback((finished) => {});
        </script>`,
      },
      {
        name: 'custom on an unknown object',
        input: html`<script>
          animations.custom((values) => values);
        </script>`,
      },
      {
        name: 'a callback referenced by name',
        input: html`<script>
          const onEnd = (finished) => {};
          SharedTransition.duration(300).withCallback(onEnd);
        </script>`,
      },
    ])('does not workletize $name', ({ input }) => {
      expect(factoryCount(input)).toBe(0);
    });
  });

  describe('worklet hash', () => {
    function workletHashes(input: string, filename = MOCK_LOCATION) {
      const { files } = runPlugin(
        input,
        {},
        { filename: path.join(__dirname, filename) }
      );
      const output = files.map((file) => file.content).join('\n');
      return [
        ...output.matchAll(/__workletHash\s*=\s*(0x[\da-f]+|\d+)/gi),
      ].map((match) => Number(match[1]));
    }

    function workletHash(input: string, filename = MOCK_LOCATION) {
      const hashes = workletHashes(input, filename);
      expect(hashes).toHaveLength(1);
      return hashes[0];
    }

    test('gives identical worklets in one file the same hash', () => {
      const hashes = workletHashes(
        "function foo() {\n  'worklet';\n  return 1;\n}\nfunction bar() {\n  'worklet';\n  return 1;\n}\n"
      );
      expect(hashes).toHaveLength(2);
      expect(hashes[0]).toBe(hashes[1]);
    });

    test('changes the hash when the worklet body changes', () => {
      const before = workletHash(
        "function foo() {\n  'worklet';\n  return 1;\n}\n"
      );
      const after = workletHash(
        "function foo() {\n  'worklet';\n  return 2;\n}\n"
      );
      expect(after).not.toBe(before);
    });

    test('changes the hash when a parameter changes', () => {
      const before = workletHash(
        "function foo(x) {\n  'worklet';\n  return 1;\n}\n"
      );
      const after = workletHash(
        "function foo(y) {\n  'worklet';\n  return 1;\n}\n"
      );
      expect(after).not.toBe(before);
    });

    test('keeps the hash when the worklet moves in the file', () => {
      const before = workletHash(
        "function foo() {\n  'worklet';\n  return 1;\n}\n"
      );
      const after = workletHash(
        "\n\nfunction foo() {\n  'worklet';\n  return 1;\n}\n"
      );
      expect(after).toBe(before);
    });

    test('separates identical text that captures different variables', () => {
      const hashes = workletHashes(
        "function a(value) {\n  return () => {\n    'worklet';\n    return value;\n  };\n}\nfunction b() {\n  return () => {\n    'worklet';\n    return value;\n  };\n}\n"
      );
      expect(hashes).toHaveLength(2);
      expect(hashes[0]).not.toBe(hashes[1]);
    });

    test('changes the hash for the same code in another file', () => {
      const input = "function foo() {\n  'worklet';\n  return 1;\n}\n";
      const first = workletHash(input, 'first.js');
      const second = workletHash(input, 'nested/first.js');
      expect(second).not.toBe(first);
    });

    test('gives the same file in two Metro projects different hashes', () => {
      const input = "function foo() {\n  'worklet';\n  return 1;\n}\n";
      const hashes = ['first-app', 'second-app'].map((app) => {
        const { files } = runPlugin(
          input,
          {},
          {
            cwd: path.join(__dirname, app),
            filename: path.join(__dirname, app, 'src', 'App.js'),
          }
        );
        const output = files.map((file) => file.content).join('\n');
        return [
          ...output.matchAll(/__workletHash\s*=\s*(0x[\da-f]+|\d+)/gi),
        ].map((match) => Number(match[1]));
      });
      expect(hashes[0]).toHaveLength(1);
      expect(hashes[1]).toHaveLength(1);
      expect(hashes[0][0]).not.toBe(hashes[1][0]);
    });

    test('separates an expression body from a block body with the same text', () => {
      const hashes = workletHashes(
        "import { useDerivedValue } from 'react-native-reanimated';\nconst a = useDerivedValue(() => ({ value: 1 }));\nconst b = useDerivedValue(() => { value: 1 });\n"
      );
      expect(hashes).toHaveLength(2);
      expect(hashes[0]).not.toBe(hashes[1]);
    });

    test('hashes the source text of autoworkletized concise arrows', () => {
      expect(
        workletHash(
          "import { useAnimatedStyle } from 'react-native-reanimated';\nconst style = useAnimatedStyle(() => ({ width: 1 }));\n"
        )
      ).toBe(7304007199455);
      expect(
        workletHash(
          "import { useDerivedValue } from 'react-native-reanimated';\nconst value = useDerivedValue(() => 1 + 2);\n"
        )
      ).toBe(16245832944540);
    });

    test('derives the hash from the relative path and the raw function text', () => {
      const value = workletHash(
        "const text = 'zażółć';\nconst foo = () => {\n  'worklet';\n  return text;\n};\n"
      );
      expect(value).toBe(6803356437101);
    });
  });

  describe('without worklets', () => {
    test('leaves code untouched and emits no factory', () => {
      const input = html`<script>
        function foo() {
          var x = 1;
        }
      </script>`;

      const result = runPlugin(input);
      expect(result.files).toHaveLength(0);
      expect(result.code).toMatchSnapshot();
    });
  });

  describe('state environment flavor detection', () => {
    const sampleInput = html`<script>
      function foo() {
        'worklet';
        return 1;
      }
    </script>`;

    function transformWithEnvName(envName: string): string {
      const result = runPlugin(sampleInput, {}, { envName });
      return workletText(result);
    }

    test('envName "production" is detected as release', () => {
      expect(transformWithEnvName('production')).not.toContain(
        '__pluginVersion'
      );
    });

    test('envName "development" is not detected as release', () => {
      expect(transformWithEnvName('development')).toContain('__pluginVersion');
    });
  });

  describe('for react-compiler', () => {
    test('prevents outlining from worklet functions', () => {
      const input = html`<script>
        const TestComponent = ({ number }) => {
          const keyToIndex = useDerivedValue(() => [1, 2, 3].map(() => null));

          return null;
        };
      </script>`;

      const result = runPlugin(
        input,
        {},
        { envName: 'development', plugins: ['babel-plugin-react-compiler'] }
      );

      const notOutlinedFunction = '.map(() => null);';
      const output = result.files[0].content;

      expect(output).toMatch(notOutlinedFunction);
      expect(output).toMatchSnapshot();
    });
  });
});

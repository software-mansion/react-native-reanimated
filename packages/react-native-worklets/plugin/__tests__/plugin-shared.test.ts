import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { strict as assert } from 'assert';
import { html } from 'code-tag';

import type { PluginOptions } from '../index';
import plugin from '../index';
import {
  generatedModules,
  redactGeneratedModules,
} from '../jest/inlineModules';

const MOCK_LOCATION = 'test.js';

type GeneratedModule = { specifier: string; content: string };

type RunResult = {
  code: string;
  modules: GeneratedModule[];
};

function runPlugin(
  input: string,
  pluginOpts: PluginOptions = {},
  transformOpts: TransformOptions = {}
): RunResult {
  const strippedInput = input.replace(/<\/?script[^>]*>/g, '');
  const transformed = transformSync(strippedInput, {
    filename: MOCK_LOCATION,
    caller: { name: 'test', supportsInlineModules: true },
    compact: false,
    babelrc: false,
    configFile: false,
    ...transformOpts,
    plugins: [...(transformOpts.plugins ?? []), [plugin, pluginOpts]],
  });
  assert(transformed);
  const code = transformed.code ?? '';
  return { code, modules: generatedModules(code) };
}

function workletText(result: RunResult): string {
  return result.modules.map((m) => m.content).join('\n');
}

describe('babel plugin core', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
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
      expect(result.modules).toHaveLength(1);
      expect(redactGeneratedModules(result.code)).toMatchSnapshot();
      expect(result.modules[0].content).toMatchSnapshot();
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
      expect(redactGeneratedModules(result.code)).toMatchSnapshot();
      expect(result.modules[0].content).toMatchSnapshot();
    });
  });

  describe('autoworkletization of runtime APIs', () => {
    function factoryCount(input: string): number {
      const result = runPlugin(input);
      return result.modules.length;
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

  describe('without worklets', () => {
    test('leaves code untouched and emits no factory', () => {
      const input = html`<script>
        function foo() {
          var x = 1;
        }
      </script>`;

      const result = runPlugin(input);
      expect(result.modules).toHaveLength(0);
      expect(redactGeneratedModules(result.code)).toMatchSnapshot();
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
      const output = result.modules[0].content;

      expect(output).toMatch(notOutlinedFunction);
      expect(output).toMatchSnapshot();
    });
  });
});

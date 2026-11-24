import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { strict as assert } from 'assert';
import { html } from 'code-tag';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { join } from 'path';

import type { PluginOptions } from '../index';
import { version as packageVersion } from '../../package.json';
import plugin from '../index';
import {
  generatedModules,
  INLINE_MODULE_PREFIX,
  redactGeneratedModules,
} from '../jest/inlineModules';
import { countOccurrences } from '../jest/pluginTestUtils';

const MOCK_LOCATION = join(__dirname, 'dev', 'null');
const REQUIRE_PREFIX = `require("${INLINE_MODULE_PREFIX}`;
const TEST_LOCATION = 'test.js';
const MOCK_TSX_LOCATION = 'test.tsx';
const WORKLET_MODULE_DIRECTIVE = /^["']worklet-module["'];/;

type GeneratedModule = { specifier: string; content: string };

type RunResult = {
  code: string;
  modules: GeneratedModule[];
};

expect.addSnapshotSerializer({
  test: (v: unknown): v is string =>
    typeof v === 'string' &&
    (v.includes('\\\\') || /(?<![A-Za-z])[A-Za-z]:[/\\]/.test(v)),
  serialize: (v, c, i, d, r, printer) =>
    printer(
      (v as string)
        .replace(/(?<![A-Za-z])[A-Za-z]:[\\/]+/g, '/')
        .replace(/\\\\/g, '/'),
      c,
      i,
      d,
      r
    ),
});

function transformWithPlugin(
  input: string,
  transformOpts: TransformOptions,
  pluginOpts: PluginOptions,
  filename: string
): string {
  const strippedInput = input.replace(/<\/?script[^>]*>/g, '');
  const transformed = transformSync(strippedInput, {
    filename,
    caller: { name: 'test', supportsInlineModules: true },
    compact: false,
    babelrc: false,
    configFile: false,
    ...transformOpts,
    plugins: [...(transformOpts.plugins || []), [plugin, pluginOpts]],
  });
  assert(transformed);
  return transformed.code ?? '';
}

function runPlugin(
  input: string,
  transformOpts: TransformOptions = {},
  pluginOpts: PluginOptions = {},
  filename: string = MOCK_LOCATION
) {
  const code = transformWithPlugin(input, transformOpts, pluginOpts, filename);
  return {
    code,
    files: generatedModules(code).map((module) => ({
      path: module.specifier,
      content: module.content,
    })),
  };
}

function workletText(result: RunResult): string {
  return result.modules.map((m) => m.content).join('\n');
}

describe('babel plugin', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
  });

  describe('independent of output formatting', () => {
    test('injects its version', () => {
      process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '0';
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain(
        `__pluginVersion = "${packageVersion}"`
      );
    });

    test('names ObjectMethod with expression key', () => {
      const input = html`<script>
        const obj = {
          ['foo']() {
            'worklet';
          },
        };
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(code).toMatch(
        /(\[(['"])foo\2\]|(['"])foo\3): require\("[^"]+"\)\.default/
      );
    });

    test("doesn't transform string literals", () => {
      const input = html`<script>
        function foo(x) {
          'worklet';
          const bar = 'worklet'; // prettier-ignore
          const baz = "worklet"; // prettier-ignore
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).toMatch(/const bar = (['"])worklet\1;/);
      expect(files[0].content).toMatch(/const baz = (['"])worklet\1;/);
      expect(files[0].content).not.toMatch(/^\s*(['"])worklet\1;/m);
    });

    test('workletizes referenced gesture callbacks using the hooks api', () => {
      const input = html`<script>
        const onBegin = () => {
          console.log('onBegin');
        };
        const foo = useTapGesture({
          numberOfTaps: 2,
          onBegin: onBegin,
        });
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(code).toMatch(/const onBegin = require\("[^"]+"\)\.default;/);
      expect(code).toMatch(
        /useTapGesture\(\{\s*numberOfTaps: 2,\s*onBegin(: onBegin)?\s*\}\)/
      );
    });

    test('makes a generator worklet factory', () => {
      const input = html`<script>
        function* foo() {
          'worklet';
          yield 'hello';
          yield 'world';
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).toMatch(/const foo = function\* ?\(\) \{/);
      expect(files[0].content).toMatch(/yield (['"])hello\1;/);
      expect(files[0].content).toMatch(/yield (['"])world\1;/);
    });

    test('makes an async worklet factory', () => {
      const input = html`<script>
        async function foo() {
          'worklet';
          await Promise.resolve();
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).toMatch(/const foo = async function ?\(\) \{/);
      expect(files[0].content).toContain('await Promise.resolve();');
    });
  });

  describe('generally', () => {
    test('removes comments from worklets', () => {
      const input = html`<script>
        const f = () => {
          'worklet';
          // some comment
          /*
           * other comment
           */
          return true;
        };
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).not.toContain('some comment');
      expect(files[0].content).not.toContain('other comment');
      expect(files[0].content).toMatchSnapshot();
    });

  });

  describe('for DirectiveLiterals', () => {
    test("doesn't bother other Directive Literals", () => {
      const input = html`<script>
        function foo() {
          'foobar';
          var foo = 'bar';
        }
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toContain('foobar');
      expect(code).toMatchSnapshot();
    });

    test("doesn't transform functions without 'worklet' directive", () => {
      const input = html`<script>
        function f(x) {
          return x + 2;
        }
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).not.toContain(REQUIRE_PREFIX);
      expect(code).toMatchSnapshot();
    });

  });

  describe('for object hooks', () => {
    test('supports empty object in useAnimatedScrollHandler', () => {
      const input = html`<script>
        useAnimatedScrollHandler({});
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

  });

  describe('for react-native-gesture-handler', () => {
    test("doesn't workletize irrelevant chained gesture object callback functions", () => {
      const input = html`<script>
        const foo = Gesture.Tap().toString();
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't transform standard callback functions", () => {
      const input = html`<script>
        const foo = Something.Tap().onEnd((_event, _success) => {
          console.log('onEnd');
        });
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't transform chained methods of objects containing Gesture property", () => {
      const input = html`<script>
        const foo = Something.Gesture.Tap().onEnd(() => {
          console.log('onEnd');
        });
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test('transforms spread operator in worklets for arrays', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          const bar = [4, 5];
          const baz = [1, ...[2, 3], ...bar];
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('...[2, 3]');
      expect(files[0].content).toContain('...bar');
      expect(files[0].content).toMatchSnapshot();
    });

    test('transforms spread operator in worklets for objects', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          const bar = { d: 4, e: 5 };
          const baz = { a: 1, ...{ b: 2, c: 3 }, ...bar };
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('...bar');
      expect(files[0].content).toMatchSnapshot();
    });

    test('transforms spread operator in worklets for function arguments', () => {
      const input = html`<script>
        function foo(...args) {
          'worklet';
          console.log(args);
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('...args');
      expect(files[0].content).toMatchSnapshot();
    });

    test('transforms spread operator in worklets for function calls', () => {
      const input = html`<script>
        function foo(arg) {
          'worklet';
          console.log(...arg);
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('...arg');
      expect(files[0].content).toMatchSnapshot();
    });

    test('transforms spread operator in Animated component', () => {
      const input = html`<script>
        function App() {
          return (
            <Animated.View
              style={[style, { ...styles.container, width: sharedValue.value }]}
            />
          );
        }
      </script>`;

      const { code } = runPlugin(input, {
        plugins: ['@babel/plugin-syntax-jsx'],
      });
      expect(code).toMatchSnapshot();
    });

  });

  describe('for sequence expressions', () => {
    test('supports SequenceExpression', () => {
      const input = html`<script>
        function App() {
          (0, fun)({ onStart() {} }, []);
        }
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

  });

  describe('is idempotent', () => {
    test('for common cases', () => {
      function resultIsIdempotent(input: string) {
        const firstResult = runPlugin(input).code;
        assert(firstResult);
        const secondResult = runPlugin(firstResult).code;
        return firstResult === secondResult;
      }

      const input1 = html`<script>
        const foo = useAnimatedStyle(() => {
          const x = 1;
        });
      </script>`;
      expect(resultIsIdempotent(input1)).toBe(true);

      const input2 = html`<script>
        const foo = useAnimatedStyle(() => {
          const bar = useAnimatedStyle(() => {
            const x = 1;
          });
        });
      </script>`;
      expect(resultIsIdempotent(input2)).toBe(true);

      const input3 = html`<script>
        const foo = useAnimatedStyle(function named() {
          const bar = useAnimatedStyle(function named() {
            const x = 1;
          });
        });
      </script>`;
      expect(resultIsIdempotent(input3)).toBe(true);

      const input4 = html`<script>
        const foo = (x) => {
          return () => {
            'worklet';
            return x;
          };
        };
      </script>`;
      expect(resultIsIdempotent(input4)).toBe(true);

      const input5 = html`<script>
        const foo = useAnimatedStyle({
          method() {
            'worklet';
            const x = 1;
          },
        });
      </script>`;
      expect(resultIsIdempotent(input5)).toBe(true);

      const input6 = html`<script>
        const foo = () => {
          'worklet';
          return useAnimatedStyle(() => {
            return () => {
              'worklet';
              return 1;
            };
          });
        };
      </script>`;
      expect(resultIsIdempotent(input6)).toBe(true);

      const input7 = html`<script>
        const scrollHandler = useAnimatedScrollHandler({
          onScroll: () => {
            return useAnimatedStyle(() => {
              return 1;
            });
          },
        });
      </script>`;
      expect(resultIsIdempotent(input7)).toBe(true);

      const input8 = html`<script>
        const scrollHandler = useAnimatedScrollHandler({
          onScroll: () => {
            return useAnimatedScrollHandler({
              onScroll: () => {
                return 1;
              },
            });
          },
        });
      </script>`;
      expect(resultIsIdempotent(input8)).toBe(true);

      const input9 = html`<script>
        Gesture.Pan.onStart(
          useAnimatedStyle(() => {
            return () => {
              'worklet';
              Gesture.Pan.onStart(() => {
                'worklet';
                return 1;
              });
            };
          })
        );
      </script>`;
      expect(resultIsIdempotent(input9)).toBe(true);
    });
  });

  describe('for Layout Animations', () => {
    test("doesn't workletize callback functions on unknown objects", () => {
      const input = html`<script>
        AmogusIn.withCallback(() => {
          console.log('AmogusIn');
        });
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects with new keyword", () => {
      const input = html`<script>
        new AmogusIn().withCallback(() => {
          console.log('AmogusIn');
        });
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects on known chained methods before", () => {
      const input = html`<script>
        AmogusIn.build().withCallback(() => {
          console.log('AmogusIn with build before');
        });
      </script>`;
      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects on known chained methods before with new keyword", () => {
      const input = html`<script>
        new AmogusIn().build().withCallback(() => {
          console.log('AmogusIn with build before');
        });
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown chained methods before", () => {
      const input = html`<script>
        FadeIn.AmogusIn().withCallback(() => {
          console.log('FadeIn with AmogusIn before');
        });
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown chained methods before with new keyword", () => {
      const input = html`<script>
        new FadeIn().AmogusIn().withCallback(() => {
          console.log('FadeIn with AmogusIn before');
        });
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects chained with known objects", () => {
      const input = html`<script>
        AmogusIn.FadeIn().withCallback(() => {
          console.log('AmogusIn with FadeIn after');
        });
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects chained with known objects with new keyword", () => {
      const input = html`<script>
        new AmogusIn().FadeIn().withCallback(() => {
          console.log('AmogusIn with FadeIn after');
        });
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects with known object chained after", () => {
      const input = html`<script>
        AmogusIn.withCallback(() => {
          console.log('AmogusIn with FadeIn before');
        }).FadeIn();
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects with known object chained after with new keyword", () => {
      const input = html`<script>
        new AmogusIn()
          .withCallback(() => {
            console.log('AmogusIn with FadeIn before');
          })
          .FadeIn();
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(0);
      expect(code).toMatchSnapshot();
    });

  });

  describe('for debugging', () => {
    test("doesn't inject version for worklets in production builds", () => {
      const input = html`<script>
        const foo = useAnimatedStyle(() => {
          const x = 1;
        });
      </script>`;

      const current = process.env.BABEL_ENV;
      process.env.BABEL_ENV = 'production';
      const { files } = runPlugin(input);
      process.env.BABEL_ENV = current;
      expect(files).toHaveLength(1);
      expect(files[0].content).not.toContain('__pluginVersion');
      expect(files[0].content).toMatchSnapshot();
    });

    test('throws a tagged exception when worklet processing fails', () => {
      const input = html`<script>
        const handler = useAnimatedScrollHandler({ ...handlers });
      </script>`;

      expect(() => runPlugin(input)).toThrow('[Worklets]');
    });
  });

});

describe('babel plugin core', () => {
  function runCorePlugin(
    input: string,
    pluginOpts: PluginOptions = {},
    transformOpts: TransformOptions = {}
  ): RunResult {
    const code = transformWithPlugin(input, transformOpts, pluginOpts, TEST_LOCATION);
    return { code, modules: generatedModules(code) };
  }

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
      const result = runCorePlugin(input);
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

      const result = runCorePlugin(input);
      expect(workletText(result)).toMatchSnapshot();
    });

    test('does not capture navigator', () => {
      const input = html`<script>
        function f() {
          'worklet';
          return navigator.gpu;
        }
      </script>`;

      const result = runCorePlugin(input);
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

      const result = runCorePlugin(input);
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

      const result = runCorePlugin(input);
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

      const result = runCorePlugin(input);
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

      const result = runCorePlugin(input);
      expect(redactGeneratedModules(result.code)).toMatchSnapshot();
      expect(result.modules[0].content).toMatchSnapshot();
    });
  });

  describe('autoworkletization of runtime APIs', () => {
    function factoryCount(input: string): number {
      const result = runCorePlugin(input);
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
      const output = workletText(runCorePlugin(input));
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

      const result = runCorePlugin(input);
      expect(result.modules).toHaveLength(1);
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

      const result = runCorePlugin(input);
      expect(result.modules).toHaveLength(1);
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

      expect(runCorePlugin(input).modules).toHaveLength(0);
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

      expect(runCorePlugin(input).modules).toHaveLength(0);
    });
  });

  describe('autoworkletization of shared transition callbacks', () => {
    function factoryCount(input: string): number {
      return runCorePlugin(input).modules.length;
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

  describe('without worklets', () => {
    test('leaves code untouched and emits no factory', () => {
      const input = html`<script>
        function foo() {
          var x = 1;
        }
      </script>`;

      const result = runCorePlugin(input);
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
      const result = runCorePlugin(sampleInput, {}, { envName });
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

      const result = runCorePlugin(
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

describe('babel plugin in bundleMode', () => {
  function runBundleModePlugin(
    input: string,
    transformOpts: TransformOptions = {},
    pluginOpts: PluginOptions = {},
    filename: string = TEST_LOCATION
  ): RunResult {
    const code = transformWithPlugin(input, transformOpts, pluginOpts, filename);
    return { code, modules: generatedModules(code) };
  }

  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
  });

  describe('source replacement', () => {
    test.each(['arrow', 'method'])(
      'does not shadow forwarded imports with the closure-free %s worklet binding',
      (kind) => {
        const name = kind === 'arrow' ? 'testJs1' : 'read';
        const body = `{ 'worklet'; return [${name}(), _${name}()]; }`;
        const expression =
          kind === 'arrow' ? `() => ${body}` : `{ read() ${body} }.read`;
        const { modules } = runBundleModePlugin(
          `
          import { first as ${name}, second as _${name} } from 'some-library';
          const f = ${expression};
        `,
          {},
          { importForwarding: { moduleNames: ['some-library'] } }
        );
        expect(modules[0].content).toContain(`const __${name} =`);
        expect(modules[0].content).toMatchSnapshot();
      }
    );

    test('packs captures in the same order at the call site and in the factory', () => {
      const { code, modules } = runBundleModePlugin(`
        function make(z, missing, a) {
          return (suffix) => {
            'worklet';
            return [z.value, missing, a, suffix];
          };
        }
        module.exports = make;
      `);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(modules[0].content).toMatchSnapshot();
    });

    test('exports closure-free worklets without a factory call', () => {
      const { code, modules } = runBundleModePlugin(`
        function factorial(n) {
          'worklet';
          return n <= 1 ? 1 : n * factorial(n - 1);
        }
        module.exports = factorial;
      `);
      expect(code).toMatch(/\.default;/);
      expect(modules[0].content).not.toContain('Factory');
      expect(modules[0].content).not.toContain('__closure');
    });

    test('replaces inline factory with a require of the generated module', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(1);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
    });

  });

  describe('import forwarding by module name', () => {
    test.each([
      ['forwards an import of the module itself', 'some-library', true],
      ['does not forward an import of a subpath', 'some-library/sub/file', false],
      [
        'does not forward a module that only shares the prefix',
        'some-library-extra',
        false,
      ],
    ])('%s', (_label, source, forwarded) => {
      const { modules } = runBundleModePlugin(
        `
        import { value } from '${source}';
        function foo() {
          'worklet';
          return value;
        }
      `,
        {},
        { importForwarding: { moduleNames: ['some-library'] } }
      );
      expect(modules).toHaveLength(1);
      expect(modules[0].content.includes(source)).toBe(forwarded);
    });

    test('does not forward a namespace import of a listed module', () => {
      const { modules } = runBundleModePlugin(
        `
        import * as value from 'some-library';
        function foo() {
          'worklet';
          return value;
        }
      `,
        {},
        { importForwarding: { moduleNames: ['some-library'] } }
      );
      expect(modules).toHaveLength(1);
      expect(modules[0].content.includes('some-library')).toBe(false);
    });
  });

  describe('import forwarding by relative path', () => {
    test.each([
      ['forwards in an app folder', '/app/src/screen.js', ['src'], true],
      [
        'forwards in a package folder with the same name',
        '/app/node_modules/some-lib/src/index.js',
        ['src'],
        true,
      ],
      [
        'forwards in a package matched by its name',
        '/app/node_modules/some-lib/src/index.js',
        ['some-lib'],
        true,
      ],
      [
        'ignores the folders before the last node_modules',
        '/my-app/node_modules/some-lib/index.js',
        ['my-app'],
        false,
      ],
      [
        'ignores a package before a nested node_modules',
        '/app/node_modules/outer/node_modules/inner/index.js',
        ['outer'],
        false,
      ],
      [
        'does not match part of a folder name',
        '/app/src-backup/screen.js',
        ['src'],
        false,
      ],
    ])('%s', (_label, filename, relativePaths, forwarded) => {
      const { modules } = runBundleModePlugin(
        `
        import { helperValue } from './helperModule';
        function foo() {
          'worklet';
          return helperValue;
        }
      `,
        {},
        {
          importForwarding: { relativePaths },
          silenceDangerousPathsWarning: true,
        },
        filename
      );
      expect(modules).toHaveLength(1);
      expect(modules[0].content.includes('helperModule')).toBe(forwarded);
    });
  });

  describe('dangerous relative paths warning', () => {
    const input = `
      function foo() {
        'worklet';
        return 1;
      }
    `;

    function warningsFor(pluginOpts: PluginOptions) {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        runBundleModePlugin(input, {}, pluginOpts);
        return warn.mock.calls
          .map(([message]) => String(message))
          .filter((message) => message.includes('importForwarding.relativePaths'));
      } finally {
        warn.mockRestore();
      }
    }

    test('warns about a path with only common folder names', () => {
      const warnings = warningsFor({
        importForwarding: { relativePaths: ['dist', 'build/esm'] },
      });
      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toContain("'dist'");
      expect(warnings[0]).toContain('silenceDangerousPathsWarning');
      expect(warnings[1]).toContain("'build/esm'");
    });

    test('warns about each path only once', () => {
      expect(
        warningsFor({ importForwarding: { relativePaths: ['shared'] } })
      ).toHaveLength(1);
      expect(
        warningsFor({ importForwarding: { relativePaths: ['shared'] } })
      ).toHaveLength(0);
    });

    test('does not warn about a path with a specific folder name', () => {
      expect(
        warningsFor({ importForwarding: { relativePaths: ['my-lib/dist'] } })
      ).toHaveLength(0);
    });

    test('does not warn about a path with an empty segment', () => {
      expect(
        warningsFor({ importForwarding: { relativePaths: ['utils/'] } })
      ).toHaveLength(0);
    });

    test('does not warn when silenced', () => {
      expect(
        warningsFor({
          importForwarding: { relativePaths: ['lib'] },
          silenceDangerousPathsWarning: true,
        })
      ).toHaveLength(0);
    });
  });

  describe('worklet module generation', () => {
    test('generates one worklet module per worklet', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
        function bar() {
          'worklet';
          var y = 2;
        }
      </script>`;

      const { modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(2);
    });

    test('requires the generated module by its inline specifier', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(1);
      expect(code).toContain(`require("${modules[0].specifier}").default`);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
    });

    test('starts the generated module with the worklet-module directive', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toMatch(WORKLET_MODULE_DIRECTIVE);
    });

    test('records the bundler module id on the worklet', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toContain(
        'const __workletModuleId = module.id;'
      );
      expect(modules[0].content).toContain(
        'foo.__moduleId = __workletModuleId;'
      );
    });

    test('reads the module id before closure variables can shadow module', () => {
      const input = html`<script>
        const module = { id: 'not-metro' };
        const __workletModuleId = 'taken';
        function foo() {
          'worklet';
          return [module.id, __workletModuleId];
        }
      </script>`;

      const { modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toContain(
        'const ___workletModuleId = module.id;'
      );
      expect(modules[0].content).toContain(
        'foo.__moduleId = ___workletModuleId;'
      );
      expect(modules[0].content).toMatchSnapshot();
    });

    test('captures instead of forwarding an import named module', () => {
      const input = html`<script>
        import { foo as module } from 'some-library';
        function bar() {
          'worklet';
          return module.id;
        }
      </script>`;

      const { modules } = runBundleModePlugin(
        input,
        {},
        { importForwarding: { moduleNames: ['some-library'] } }
      );
      expect(modules).toHaveLength(1);
      expect(modules[0].content).not.toContain('some-library');
      expect(modules[0].content).toContain(
        'const __workletModuleId = module.id;'
      );
      expect(modules[0].content).toMatch(/Factory\(\[module\]\)/);
      expect(modules[0].content).toContain(
        'bar.__moduleId = __workletModuleId;'
      );
    });

    test('renames a closure-free worklet named module away from the module wrapper binding', () => {
      const input = html`<script>
        function module() {
          'worklet';
          return 1;
        }
      </script>`;

      const { modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).not.toMatch(/const module\b/);
      expect(modules[0].content).toContain(
        'const __workletModuleId = module.id;'
      );
      expect(modules[0].content).toContain('const _module = function');
      expect(modules[0].content).toContain(
        '_module.__moduleId = __workletModuleId;'
      );
      expect(modules[0].content).toContain('export default _module;');
    });

    test('closure-free generated module exports the worklet directly', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
          return x;
        }
      </script>`;

      const { modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toMatchSnapshot();
    });

    test('does not emit init data', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, modules } = runBundleModePlugin(input);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(modules[0].content).toMatchSnapshot();
    });

    test('does not emit stack-trace machinery', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).not.toContain('__stackDetails');
      expect(modules[0].content).toMatchSnapshot();
    });

    test('generates a worklet module when cwd has no @babel/preset-typescript reachable', () => {
      const isolatedDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'worklets-isolated-cwd-')
      );
      fs.mkdirSync(path.join(isolatedDir, 'node_modules'), {
        recursive: true,
      });
      const previousCwd = process.cwd();

      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      expect(() =>
        require.resolve('@babel/preset-typescript', {
          paths: [isolatedDir],
        })
      ).toThrow();

      try {
        process.chdir(isolatedDir);
        const { modules } = runBundleModePlugin(input);
        expect(modules).toHaveLength(1);
      } finally {
        process.chdir(previousCwd);
        fs.rmSync(isolatedDir, { recursive: true, force: true });
      }
    });

    test('forwards closure variables from source to factory', () => {
      const input = html`<script>
        const a = 1;
        const b = 2;
        function foo() {
          'worklet';
          return a + b;
        }
      </script>`;

      const { code, modules } = runBundleModePlugin(input);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(modules[0].content).toMatchSnapshot();
    });

    test('preserves workletizable library imports in the generated module', () => {
      const input = html`<script>
        import { foo } from 'some-library';
        function bar() {
          'worklet';
          return foo();
        }
      </script>`;

      const { code, modules } = runBundleModePlugin(
        input,
        {},
        { importForwarding: { moduleNames: ['some-library'] } }
      );
      expect(modules).toHaveLength(1);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(modules[0].content).toMatchSnapshot();
    });

    test('strips JSX dev attributes in generated modules', () => {
      const input = html`<script>
        import { ImportedComponent } from 'react-native-worklets';

        function renderView() {
          'worklet';
          return <ImportedComponent />;
        }
      </script>`;

      const control = transformSync(input.replace(/<\/?script[^>]*>/g, ''), {
        filename: MOCK_TSX_LOCATION,
        compact: false,
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-react', { runtime: 'classic', development: true }],
        ],
        envName: 'development',
      })!.code;
      expect(control).toContain('__self');
      expect(control).toContain('__source');

      const { modules } = runBundleModePlugin(
        input,
        {
          presets: [
            ['@babel/preset-react', { runtime: 'classic', development: true }],
          ],
          envName: 'development',
        },
        { importForwarding: { moduleNames: ['react-native-worklets'] } },
        MOCK_TSX_LOCATION
      );
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toContain('return <ImportedComponent />;');
      expect(modules[0].content).not.toContain('__self');
      expect(modules[0].content).not.toContain('__source');
    });

    test('captures locally defined JSX components in the closure', () => {
      const input = html`<script>
        function LocalComponent() {
          return null;
        }

        function renderView() {
          'worklet';
          return <LocalComponent />;
        }
      </script>`;

      const { code } = runBundleModePlugin(
        input,
        { presets: [['@babel/preset-react', { runtime: 'classic' }]] },
        {},
        MOCK_TSX_LOCATION
      );
      expect(code).toContain('LocalComponent');
      expect(redactGeneratedModules(code)).toMatchSnapshot();
    });

    test('keeps relative imports as written, since the module resolves from the importer', () => {
      const input = html`<script>
        import { foo } from './bar';
        function baz() {
          'worklet';
          return foo();
        }
      </script>`;

      const { modules } = runBundleModePlugin(
        input,
        {},
        { importForwarding: { relativePaths: ['some-library'] } },
        '/some-library/src/file.ts'
      );
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toContain(`from "./bar"`);
    });

    test('keeps relative requires inside the worklet body as written', () => {
      const input = html`<script>
        function baz() {
          'worklet';
          const helper = require('./helper');
          return helper.foo();
        }
      </script>`;

      const { modules } = runBundleModePlugin(
        input,
        {},
        { importForwarding: { relativePaths: ['some-library'] } },
        '/some-library/file.js'
      );
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toMatch(/require\(["']\.\/helper["']\)/);
      expect(modules[0].content).toMatchSnapshot();
    });

    test('keeps relative dynamic imports inside the worklet body as written', () => {
      const input = html`<script>
        function baz() {
          'worklet';
          return import('./helper');
        }
      </script>`;

      const { modules } = runBundleModePlugin(input, {}, {}, '/some-library/file.js');
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toMatch(/import\(["']\.\/helper["']\)/);
      expect(modules[0].content).toMatchSnapshot();
    });
  });

  describe('nested worklets', () => {
    test('extracts each nested worklet into its own module', () => {
      const input = html`<script>
        const foo = function () {
          'worklet';
          const bar = function () {
            'worklet';
            return 1;
          };
          return bar();
        };
      </script>`;

      const { code, modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(2);
      const sourceRequires = countOccurrences(code, REQUIRE_PREFIX);
      expect(sourceRequires).toBe(1);
      const [outerModule, innerModule] = modules;
      expect(code).toContain(outerModule.specifier);
      expect(outerModule.content).toContain(innerModule.specifier);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(redactGeneratedModules(outerModule.content)).toMatchSnapshot();
    });
  });

  describe('bail-out on already-generated worklet modules', () => {
    test('does not re-process a module with the worklet-module directive', () => {
      const input = html`<script>
        'worklet-module';
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, modules } = runBundleModePlugin(input);
      expect(modules).toHaveLength(0);
      expect(code).not.toContain(REQUIRE_PREFIX);
    });

    test('autoworkletization fires before generating a module', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          scheduleOnUI(() => {
            return 1;
          });
        }
      </script>`;

      const { modules: firstPass } = runBundleModePlugin(input);
      assert(firstPass.length >= 1);
      const outerModule = firstPass[0];

      const { code: rePassedCode } = runBundleModePlugin(outerModule.content);

      expect(rePassedCode).toContain(REQUIRE_PREFIX);
    });
  });
});

import { transformSync } from '@babel/core';
import { strict as assert } from 'assert';
import { html } from 'code-tag';

type CapturedFile = { path: string; content: string };

const capturedFiles: CapturedFile[] = [];

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  const stagedFiles = new Map<string, string>();
  return {
    ...actual,
    writeFileSync: (filepath: string, content: string) => {
      stagedFiles.set(String(filepath), String(content));
    },
    renameSync: (from: string, to: string) => {
      capturedFiles.push({
        path: String(to),
        content: stagedFiles.get(String(from))!,
      });
      stagedFiles.delete(String(from));
    },
  };
});

// eslint-disable-next-line import/first
import type { PluginOptions } from '../plugin';
// eslint-disable-next-line import/first
import plugin from '../plugin';

const MOCK_LOCATION = 'test.js';

type RunResult = {
  code: string;
  files: CapturedFile[];
};

function runPlugin(
  input: string,
  pluginOpts: PluginOptions = {},
  filename: string = MOCK_LOCATION
): RunResult {
  const strippedInput = input.replace(/<\/?script[^>]*>/g, '');
  const transformed = transformSync(strippedInput, {
    filename,
    compact: false,
    babelrc: false,
    configFile: false,
    plugins: [[plugin, pluginOpts]],
  });
  assert(transformed);
  return { code: transformed.code ?? '', files: [...capturedFiles] };
}

function workletText(result: RunResult): string {
  return result.files.map((f) => f.content).join('\n');
}

describe('babel plugin core', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
    capturedFiles.length = 0;
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
    </script>`.replace(/<\/?script[^>]*>/g, '');

    function transformWithEnvName(envName: string): string {
      capturedFiles.length = 0;
      const transformed = transformSync(sampleInput, {
        filename: MOCK_LOCATION,
        compact: false,
        babelrc: false,
        configFile: false,
        envName,
        plugins: [[plugin, {}]],
      });
      assert(transformed);
      return capturedFiles.map((f) => f.content).join('\n');
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
});

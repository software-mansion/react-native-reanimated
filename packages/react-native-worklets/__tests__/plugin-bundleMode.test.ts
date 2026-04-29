import '../plugin/src/jestMatchers';

import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { strict as assert } from 'assert';
import { html } from 'code-tag';
import * as os from 'os';
import * as path from 'path';

type CapturedFile = { path: string; content: string };

const capturedFiles: CapturedFile[] = [];

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    writeFileSync: (filepath: string, content: string) => {
      capturedFiles.push({ path: String(filepath), content: String(content) });
    },
  };
});

// eslint-disable-next-line import/first
import type { PluginOptions } from '../plugin';
// eslint-disable-next-line import/first
import plugin from '../plugin';

const MOCK_LOCATION = os.devNull;
const MOCK_WORKLET_RUNTIME_ENTRY = path.join(
  os.tmpdir(),
  'workletRuntimeEntry.native.ts'
);
const MOCK_OTHER_FILE = path.join(os.tmpdir(), 'someOtherFile.ts');

function runPlugin(
  input: string,
  transformOpts: TransformOptions = {},
  pluginOpts: PluginOptions = {},
  filename: string = MOCK_LOCATION
) {
  const strippedInput = input.replace(/<\/?script[^>]*>/g, '');
  const config = {
    filename,
    compact: false,
    babelrc: false,
    configFile: false,
    ...transformOpts,
    plugins: [
      ...(transformOpts.plugins || []),
      [plugin, { ...pluginOpts, bundleMode: true }],
    ],
  };
  const transformed = transformSync(strippedInput, config);
  assert(transformed);
  return { code: transformed.code, files: [...capturedFiles] };
}

describe('babel plugin in bundleMode', () => {
  beforeEach(() => {
    process.env.REANIMATED_JEST_SHOULD_MOCK_SOURCE_MAP = '1';
    process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION = '1';
    capturedFiles.length = 0;
  });

  describe('source replacement', () => {
    test('does not emit factory body inline in source', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toContain('Factory({');
      expect(code).not.toContain('__workletHash');
      expect(code).not.toContain('__pluginVersion');
      expect(code).not.toContain('__stackDetails');
    });

    test('still captures closure even with "no-worklet-closure" directive', () => {
      const input = html`<script>
        const x = 1;
        function foo() {
          'worklet';
          'no-worklet-closure';
          return x;
        }
      </script>`;

      const { code, files } = runPlugin(input);
      expect(code).toMatch(/\.default\(\{\s*x\s*\}\)/);
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('__closure = {\n    x\n  }');
    });
  });

  describe('worklet file emission', () => {
    test('writes one worklet file per worklet', () => {
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

      const { files } = runPlugin(input);
      expect(files).toHaveLength(2);
    });

    test('written file path matches the require path', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, files } = runPlugin(input);
      const match = code.match(
        /require\("react-native-worklets\/\.worklets\/(\d+)\.js"\)/
      );
      assert(match);
      const hash = match[1];
      expect(files).toHaveLength(1);
      expect(files[0].path).toMatch(
        new RegExp(`react-native-worklets/\\.worklets/${hash}\\.js$`)
      );
    });

    test('written file content has factory shape', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
          return x;
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      const content = files[0].content;
      expect(content).toMatch(/^export default \(function foo_\w+Factory\(/);
      expect(content).toContain('__closure = {}');
      expect(content).toMatch(/__workletHash = \d+/);
      expect(content).toContain('__pluginVersion = "x.y.z"');
      expect(content).toContain('__stackDetails = _e');
      expect(content).toContain('return foo;');
    });

    test('does not emit init data', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, files } = runPlugin(input);
      for (const text of [code, files[0].content]) {
        expect(text).not.toMatch(/_worklet_\d+_init_data/);
        expect(text).not.toContain('__initData');
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

      const { code, files } = runPlugin(input);
      expect(code).toMatch(
        /require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default\(\{\s*a,\s*b\s*\}\)/
      );
      const content = files[0].content;
      expect(content).toMatch(/Factory\(\{\s*a,\s*b\s*\}\)/);
      expect(content).toContain('__closure = {\n    a,\n    b\n  }');
    });

    test('preserves workletizable library imports in the written worklet file', () => {
      const input = html`<script>
        import { foo } from 'some-library';
        function bar() {
          'worklet';
          return foo();
        }
      </script>`;

      const { code, files } = runPlugin(
        input,
        {},
        { workletizableModules: ['some-library'] }
      );
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('from "some-library"');
      // Library bindings are imported by the worklet file itself,
      // so they aren't passed via the factory call closure.
      expect(code).toMatch(/\.default\(\{\s*\}\)/);
    });
  });

  describe('workletRuntimeEntry toggle', () => {
    test('flips _WORKLETS_BUNDLE_MODE_ENABLED to true in workletRuntimeEntry', () => {
      const input = html`<script>
        globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;
      </script>`;

      const { code } = runPlugin(input, {}, {}, MOCK_WORKLET_RUNTIME_ENTRY);
      expect(code).toContain(
        'globalThis._WORKLETS_BUNDLE_MODE_ENABLED = true;'
      );
    });

    test('does not flip the flag in unrelated files', () => {
      const input = html`<script>
        globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;
      </script>`;

      const { code } = runPlugin(input, {}, {}, MOCK_OTHER_FILE);
      expect(code).toContain(
        'globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;'
      );
    });

    test('does not flip the flag without bundleMode option', () => {
      const input = html`<script>
        globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;
      </script>`;

      const transformed = transformSync(
        input.replace(/<\/?script[^>]*>/g, ''),
        {
          filename: MOCK_WORKLET_RUNTIME_ENTRY,
          compact: false,
          babelrc: false,
          configFile: false,
          plugins: [[plugin, {}]],
        }
      );
      assert(transformed?.code);
      expect(transformed.code).toContain(
        'globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;'
      );
    });
  });

  describe('without worklets', () => {
    test('does not write any file when no worklets are present', () => {
      const input = html`<script>
        function foo() {
          var x = 1;
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(0);
    });
  });

  describe('worklet shapes', () => {
    const cases: Array<{ name: string; input: string }> = [
      {
        name: 'ArrowFunctionExpression',
        input: html`<script>
          const foo = () => {
            'worklet';
            return 1;
          };
        </script>`,
      },
      {
        name: 'FunctionExpression',
        input: html`<script>
          const foo = function () {
            'worklet';
            return 1;
          };
        </script>`,
      },
      {
        name: 'ObjectMethod',
        input: html`<script>
          const obj = {
            foo() {
              'worklet';
              return 1;
            },
          };
        </script>`,
      },
    ];

    test.each(cases)('extracts $name to a file', ({ input }) => {
      const { code, files } = runPlugin(input);
      expect(code).toMatch(
        /require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default\(/
      );
      expect(files).toHaveLength(1);
      expect(files[0].content).toMatch(
        /^export default \(function \w+Factory\(/
      );
    });
  });

  describe('nested worklets', () => {
    test('extracts each nested worklet into its own file', () => {
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

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(2);
      // Source has require for outer worklet only.
      const outerMatches = code.match(
        /require\("react-native-worklets\/\.worklets\/\d+\.js"\)/g
      );
      expect(outerMatches).toHaveLength(1);
      // Outer worklet's file body itself contains a require for the inner worklet.
      const outerFile = files.find((f) =>
        code.includes(f.path.split('/').pop()!)
      );
      assert(outerFile);
      expect(outerFile.content).toMatch(
        /require\("react-native-worklets\/\.worklets\/\d+\.js"\)\.default\(/
      );
    });
  });

  describe('autoworkletized hook callbacks', () => {
    test('extracts useAnimatedStyle callback to a file', () => {
      const input = html`<script>
        import { useAnimatedStyle } from 'react-native-reanimated';
        function Box() {
          const style = useAnimatedStyle(() => ({ width: 100 }));
        }
      </script>`;

      const { code, files } = runPlugin(input);
      expect(code).toContain(
        'useAnimatedStyle(require("react-native-worklets/.worklets/'
      );
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('width: 100');
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

      const { code, files } = runPlugin(input);
      expect(code).toMatch(/\.default\(\{\s*\}\)/);
      expect(files[0].content).toContain('__closure = {}');
    });

    test('captures locally bound variables shadowing globals', () => {
      const input = html`<script>
        const console = { log: () => null };
        function f() {
          'worklet';
          console.log('hi');
        }
      </script>`;

      const { code, files } = runPlugin(input);
      expect(code).toMatch(/\.default\(\{\s*console\s*\}\)/);
      expect(files[0].content).toContain('__closure = {\n    console\n  }');
    });
  });
});

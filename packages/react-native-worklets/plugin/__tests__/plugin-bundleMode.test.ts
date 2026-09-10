import '../src/jestMatchers';

import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { strict as assert } from 'assert';
import { html } from 'code-tag';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runInNewContext } from 'vm';

import type { WorkletFactory, WorkletFunction } from '../../src/types';
import { countOccurrences } from '../jest/pluginTestUtils';

type CapturedFile = { path: string; content: string };

const capturedFiles: CapturedFile[] = [];

// The OXC transform writes its files from Rust, so they never reach the `fs`
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
  const actual = jest.requireActual('fs');
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
const MOCK_TSX_LOCATION = 'test.tsx';
const MOCK_WORKLET_RUNTIME_ENTRY = 'react-native-worklets/src/index.ts';
const MOCK_OTHER_FILE = 'someOtherFile.ts';

const TOGGLE_PATH_CASES: ReadonlyArray<[label: string, filename: string]> = [
  ['source entry-point', MOCK_WORKLET_RUNTIME_ENTRY],
  ['source mode-check', 'react-native-worklets/src/debug/bundleMode.native.ts'],
  ['built entry-point', 'react-native-worklets/lib/module/index.js'],
  [
    'built mode-check',
    'react-native-worklets/lib/module/debug/bundleMode.native.js',
  ],
];

const REQUIRE_PREFIX = 'require("react-native-worklets/.worklets/';

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
      [plugin, { disableSourceMaps: true, ...pluginOpts, bundleMode: true }],
    ],
  };
  const transformed = transformSync(strippedInput, config);
  assert(transformed);
  return { code: transformed.code ?? '', files: emittedFiles() };
}

function evaluateBundle<T = unknown>(
  code: string,
  files: CapturedFile[],
  imports: Record<string, Record<string, unknown>> = {}
) {
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const load = (filename: string): Record<string, unknown> => {
    if (Object.prototype.hasOwnProperty.call(imports, filename)) {
      return imports[filename];
    }
    const name = path.basename(filename);
    if (cache.has(name)) {
      return cache.get(name)!.exports;
    }
    const file = files.find(
      (candidate) => path.basename(candidate.path) === name
    );
    assert(file, `Missing generated module ${filename}`);
    const module = { exports: {} };
    cache.set(name, module);
    const transformed = transformSync(file.content, {
      babelrc: false,
      configFile: false,
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    });
    runInNewContext(transformed!.code!, {
      require: load,
      module,
      exports: module.exports,
    });
    return module.exports;
  };
  const module: { exports: unknown } = { exports: {} };
  runInNewContext(code, { require: load, module });
  return { exports: module.exports as T, load };
}

describe('babel plugin in bundleMode', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
    capturedFiles.length = 0;
    nativelyEmittedFiles().length = 0;
  });

  describe('source replacement', () => {
    test.each(['arrow', 'method'])(
      'does not shadow forwarded imports with the closure-free %s worklet binding',
      (kind) => {
        const name = kind === 'arrow' ? 'testJs1' : 'read';
        const body = `{ 'worklet'; return [${name}(), _${name}()]; }`;
        const expression =
          kind === 'arrow' ? `() => ${body}` : `{ read() ${body} }.read`;
        const { files } = runPlugin(
          `
          import { first as ${name}, second as _${name} } from 'some-library';
          const f = ${expression};
        `,
          {},
          { importForwarding: { moduleNames: ['some-library'] } }
        );
        const { load } = evaluateBundle('', files, {
          'some-library': { first: () => 41, second: () => 1 },
        });
        const worklet = load(files[0].path).default as WorkletFunction;
        expect(worklet()).toEqual([41, 1]);
        expect(worklet.__closure).toBeUndefined();
      }
    );

    test('preserves capture order, undefined values and independent instances across runtimes', () => {
      const { code, files } = runPlugin(`
        function make(z, missing, a) {
          return (suffix) => {
            'worklet';
            return [z.value, missing, a, suffix];
          };
        }
        module.exports = make;
      `);
      const { exports: make } = evaluateBundle<
        (z: { value: number }, missing: undefined, a: string) => WorkletFunction
      >(code, files);
      const first = make({ value: 7 }, undefined, 'first');
      const second = make({ value: 9 }, undefined, 'second');
      expect(first.__closure).toEqual([{ value: 7 }, undefined, 'first']);
      expect(second.__closure).toEqual([{ value: 9 }, undefined, 'second']);
      expect(first('RN')).toEqual([7, undefined, 'first', 'RN']);

      const { load } = evaluateBundle('', files);
      const factory = load(`${first.__workletHash}.js`)
        .default as WorkletFactory;
      const restored = factory(first.__closure!);
      expect(restored('UI')).toEqual([7, undefined, 'first', 'UI']);
      expect(factory(second.__closure!)('UI')).toEqual([
        9,
        undefined,
        'second',
        'UI',
      ]);
      expect(restored.__closure).toEqual(first.__closure);
      expect(restored.__workletHash).toBe(first.__workletHash);
    });

    test('exports closure-free worklets directly without invoking them during loading', () => {
      const { code, files } = runPlugin(`
        function factorial(n) {
          'worklet';
          if (n === undefined) throw new Error('invoked during loading');
          return n <= 1 ? 1 : n * factorial(n - 1);
        }
        module.exports = factorial;
      `);
      expect(code).toMatch(/\.default;/);
      expect(files[0].content).not.toContain('Factory');
      expect(files[0].content).not.toContain('__closure');
      const { exports: worklet } = evaluateBundle<WorkletFunction>(code, files);
      expect(worklet(5)).toBe(120);
      expect(worklet.__closure).toBeUndefined();
      const { load } = evaluateBundle('', files);
      const restored = load(`${worklet.__workletHash}.js`)
        .default as WorkletFunction;
      expect(restored(6)).toBe(720);
      expect(restored.__workletHash).toBe(worklet.__workletHash);
    });

    test('supports nested worklets with and without captures', () => {
      const { code, files } = runPlugin(`
        function outer(value) {
          'worklet';
          const captured = () => {
            'worklet';
            return value;
          };
          const empty = () => {
            'worklet';
            return 42;
          };
          return [captured, empty];
        }
        module.exports = outer;
      `);
      const { exports: outer } = evaluateBundle<
        WorkletFunction<[string], [WorkletFunction, WorkletFunction]>
      >(code, files);
      const [captured, empty] = outer('nested');
      expect(outer.__closure).toBeUndefined();
      expect(captured.__closure).toEqual(['nested']);
      expect(empty.__closure).toBeUndefined();
      expect(captured()).toBe('nested');
      expect(empty()).toBe(42);
    });

    test('replaces inline factory with a require to the worklet file', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(code).toMatchSnapshot();
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
      expect(files).toHaveLength(1);
      expect(code).toMatchSnapshot();
      expect(files[0].content).toMatchSnapshot();
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
      expect(files).toHaveLength(1);
      const fileBasename = path.basename(files[0].path);
      expect(code).toContain(`${REQUIRE_PREFIX}${fileBasename}"`);
      expect(code).toMatchSnapshot();
    });

    test('written closure-free file exports the worklet directly', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
          return x;
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).toMatchSnapshot();
    });

    test('does not emit init data', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, files } = runPlugin(input);
      expect(code).toMatchSnapshot();
      expect(files[0].content).toMatchSnapshot();
    });

    test('does not emit stack-trace machinery', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).not.toContain('__stackDetails');
      expect(files[0].content).toMatchSnapshot();
    });

    test('emits a worklet file when cwd has no @babel/preset-typescript reachable', () => {
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
        const { files } = runPlugin(input);
        expect(files).toHaveLength(1);
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

      const { code, files } = runPlugin(input);
      expect(code).toMatchSnapshot();
      expect(files[0].content).toMatchSnapshot();
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
        { importForwarding: { moduleNames: ['some-library'] } }
      );
      expect(files).toHaveLength(1);
      expect(code).toMatchSnapshot();
      expect(files[0].content).toMatchSnapshot();
    });

    test('strips JSX dev attributes in written worklet files', () => {
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

      const { files } = runPlugin(
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
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('return <ImportedComponent />;');
      expect(files[0].content).not.toContain('__self');
      expect(files[0].content).not.toContain('__source');
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

      const { code } = runPlugin(
        input,
        { presets: [['@babel/preset-react', { runtime: 'classic' }]] },
        {},
        MOCK_TSX_LOCATION
      );
      expect(code).toContain('LocalComponent');
      expect(code).toMatchSnapshot();
    });

    test('rebases relative imports against the worklets directory', () => {
      const input = html`<script>
        import { foo } from './bar';
        function baz() {
          'worklet';
          return foo();
        }
      </script>`;

      const fakeFilename = '/some-library/src/file.ts';
      const { files } = runPlugin(
        input,
        {},
        { importForwarding: { relativePaths: ['some-library'] } },
        fakeFilename
      );
      const filesDirPath = path.resolve(
        path.dirname(require.resolve('react-native-worklets/package.json')),
        '.worklets'
      );
      const expected = path
        .relative(filesDirPath, '/some-library/src/bar')
        .split(path.sep)
        .join('/');
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain(`from "${expected}"`);
    });

    test('rebases relative requires inside the worklet body against the worklets directory', () => {
      const input = html`<script>
        function baz() {
          'worklet';
          const helper = require('./helper');
          return helper.foo();
        }
      </script>`;

      const fakeFilename = path.resolve(
        __dirname,
        '../../../some-library/file.js'
      );
      const { files } = runPlugin(
        input,
        {},
        { importForwarding: { relativePaths: ['some-library'] } },
        fakeFilename
      );
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain(
        `require("../../some-library/helper")`
      );
      expect(files[0].content).toMatchSnapshot();
    });

    test('does not rebase relative requires from non-workletizable files', () => {
      const input = html`<script>
        function baz() {
          'worklet';
          const helper = require('./helper');
          return helper.foo();
        }
      </script>`;

      const fakeFilename = '/not-a-workletizable-package/src/file.ts';
      const { files } = runPlugin(input, {}, {}, fakeFilename);
      expect(files).toHaveLength(1);
      expect(files[0].content).toMatch(/require\(["']\.\/helper["']\)/);
      expect(files[0].content).toMatchSnapshot();
    });
  });

  describe('bundle mode flag toggle', () => {
    for (const [label, filename] of TOGGLE_PATH_CASES) {
      test(`flips _WORKLETS_BUNDLE_MODE_ENABLED to true in the ${label} file`, () => {
        const input = html`<script>
          globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;
        </script>`;

        const { code } = runPlugin(input, {}, {}, filename);
        expect(code).toContain(
          'globalThis._WORKLETS_BUNDLE_MODE_ENABLED = true;'
        );
      });
    }

    test('does not flip the flag in unrelated files', () => {
      const input = html`<script>
        globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;
      </script>`;

      const { code } = runPlugin(input, {}, {}, MOCK_OTHER_FILE);
      expect(code).toMatchSnapshot();
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
      const sourceRequires = countOccurrences(code, REQUIRE_PREFIX);
      expect(sourceRequires).toBe(1);
      const outerFile = files.find((f) => code.includes(path.basename(f.path)));
      assert(outerFile);
      expect(code).toMatchSnapshot();
      expect(outerFile.content).toMatchSnapshot();
    });

    test('writes the inner worklet file before the outer one', () => {
      // Inner factory must be on disk before the outer one references it via require().
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
      assert(files.length === 2);
      const outerFile = files.find((f) => code.includes(path.basename(f.path)));
      assert(outerFile);
      expect(files[files.length - 1]).toBe(outerFile);
    });
  });

  describe('with source maps enabled', () => {
    test('emits a worklet file without crashing', () => {
      // Other tests in this file disable source maps so the filename can be
      // arbitrary; here we run with real source-map generation against a real
      // file path so that path is at least exercised once.
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, files } = runPlugin(
        input,
        {},
        { disableSourceMaps: false },
        __filename
      );
      expect(files).toHaveLength(1);
      expect(code).toContain(REQUIRE_PREFIX);
    });
  });

  describe('bail-out on already-generated worklet files', () => {
    test('does not re-process a file inside the .worklets directory', () => {
      const generatedFilename = path.join(
        path.dirname(require.resolve('react-native-worklets/package.json')),
        '.worklets',
        '12345.js'
      );
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, files } = runPlugin(input, {}, {}, generatedFilename);
      expect(files).toHaveLength(0);
      expect(code).not.toContain(REQUIRE_PREFIX);
    });

    test('autoworkletization fires before emitting a file', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          scheduleOnUI(() => {
            return 1;
          });
        }
      </script>`;

      const { files: firstPass } = runPlugin(input);
      assert(firstPass.length >= 1);
      const outerFile = firstPass[firstPass.length - 1];

      const { code: rePassedCode } = runPlugin(
        outerFile.content,
        {},
        {},
        outerFile.path
      );

      expect(rePassedCode).toContain(REQUIRE_PREFIX);
    });
  });
});

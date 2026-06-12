import '../plugin/src/jestMatchers';

import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { strict as assert } from 'assert';
import { html } from 'code-tag';
import * as path from 'path';

import { countOccurrences } from '../jest/pluginTestUtils';

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

const MOCK_LOCATION = 'test.js';
const MOCK_WORKLET_RUNTIME_ENTRY = 'react-native-worklets/src/index.ts';
const MOCK_OTHER_FILE = 'someOtherFile.ts';

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
  return { code: transformed.code ?? '', files: [...capturedFiles] };
}

describe('babel plugin in bundleMode', () => {
  beforeEach(() => {
    process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION = '1';
    capturedFiles.length = 0;
  });

  describe('source replacement', () => {
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

      const fakeFilename = path.relative(__dirname, 'some-library/file.js');
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
      expect(files[0].content).toContain(`require('./helper')`);
      expect(files[0].content).toMatchSnapshot();
    });
  });

  describe('worklet runtime entry-point toggle', () => {
    test('flips _WORKLETS_BUNDLE_MODE_ENABLED to true in the entry-point', () => {
      const input = html`<script>
        globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;
      </script>`;

      const { code } = runPlugin(input, {}, {}, MOCK_WORKLET_RUNTIME_ENTRY);
      expect(code).toMatchSnapshot();
    });

    test('does not flip the flag in unrelated files', () => {
      const input = html`<script>
        globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;
      </script>`;

      const { code } = runPlugin(input, {}, {}, MOCK_OTHER_FILE);
      expect(code).toMatchSnapshot();
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
      expect(transformed.code).toMatchSnapshot();
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

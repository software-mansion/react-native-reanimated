import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { strict as assert } from 'assert';
import { html } from 'code-tag';


type CapturedFile = { path: string; content: string };

const capturedFiles: CapturedFile[] = [];

// The OXC transform writes its files from Rust, so they never reach the `fs`
// mock below. Its jest setup records them on `globalThis` instead.
function nativelyEmittedFiles(): CapturedFile[] {
  return ((
    globalThis as { __WORKLETS_OXC_EMITTED__?: CapturedFile[] }
  ).__WORKLETS_OXC_EMITTED__ ??= []);
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
import { version as packageVersion } from '../../package.json';
// eslint-disable-next-line import/first
import type { PluginOptions } from '../index';
// eslint-disable-next-line import/first
import plugin from '../index';

const MOCK_LOCATION = '/dev/null';

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

function runPlugin(
  input: string,
  transformOpts: TransformOptions = {},
  pluginOpts: PluginOptions = {},
  filename: string = MOCK_LOCATION
) {
  const startIndex = capturedFiles.length;
  const nativeStartIndex = nativelyEmittedFiles().length;
  const strippedInput = input.replace(/<\/?script[^>]*>/g, '');
  const config = {
    filename,
    caller: { name: 'metro', bundler: 'metro' },
    compact: false,
    babelrc: false,
    configFile: false,
    ...transformOpts,
    plugins: [...(transformOpts.plugins || []), [plugin, pluginOpts]],
  };
  const transformed = transformSync(strippedInput, config);
  assert(transformed);
  return {
    code: transformed.code ?? '',
    files:
      capturedFiles.length > startIndex
        ? capturedFiles.slice(startIndex)
        : nativelyEmittedFiles().slice(nativeStartIndex),
  };
}

describe('babel plugin', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
    capturedFiles.length = 0;
  });

  describe('generally', () => {
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
  });

  describe('for worklet names', () => {
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
      expect(code).toMatchSnapshot();
    });
  });

  describe('for DirectiveLiterals', () => {
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
      expect(files[0].content).toContain("bar = 'worklet';");
      expect(files[0].content).toContain('baz = "worklet";');
      expect(files[0].content).toMatchSnapshot();
    });
  });

  describe('for react-native-gesture-handler', () => {
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
      expect(code).toMatchSnapshot();
    });
  });

  describe('for generators', () => {
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
      expect(files[0].content).toContain('const foo = function* () {');
      expect(files[0].content).toContain("yield 'hello';");
      expect(files[0].content).toMatchSnapshot();
    });
  });

  describe('for async functions', () => {
    test('makes an async worklet factory', () => {
      const input = html`<script>
        async function foo() {
          'worklet';
          await Promise.resolve();
        }
      </script>`;

      const { files } = runPlugin(input);
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('const foo = async function () {');
      expect(files[0].content).toContain('await Promise.resolve();');
      expect(files[0].content).toMatchSnapshot();
    });
  });
});

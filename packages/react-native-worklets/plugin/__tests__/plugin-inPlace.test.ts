import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { strict as assert } from 'assert';
import { html } from 'code-tag';

type CapturedFile = { path: string; content: string };

const capturedFiles: CapturedFile[] = [];

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
  const stagedFiles = new Map<string, string>();
  return {
    ...actual,
    writeFileSync: (filepath: string, content: string) => {
      stagedFiles.set(String(filepath), String(content));
    },
    renameSync: (from: string, to: string) => {
      const content = stagedFiles.get(String(from));
      if (content === undefined) {
        throw new Error(`renameSync: ${String(from)} was never written`);
      }
      capturedFiles.push({ path: String(to), content });
      stagedFiles.delete(String(from));
    },
  };
});

// eslint-disable-next-line import/first
import type { PluginOptions } from '../index';
// eslint-disable-next-line import/first
import plugin from '../index';

const MOCK_LOCATION = 'test.js';

function runPlugin(
  input: string,
  transformOpts: TransformOptions = {},
  pluginOpts: PluginOptions = {}
) {
  capturedFiles.length = 0;
  nativelyEmittedFiles().length = 0;
  const strippedInput = input.replace(/<\/?script[^>]*>/g, '');
  const transformed = transformSync(strippedInput, {
    filename: MOCK_LOCATION,
    compact: false,
    babelrc: false,
    configFile: false,
    ...transformOpts,
    plugins: [...(transformOpts.plugins ?? []), [plugin, pluginOpts]],
  });
  assert(transformed);
  return { code: transformed.code ?? '', files: emittedFiles() };
}

describe('babel plugin without a Metro caller', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
  });

  test('emits the worklet factory in place without a caller', () => {
    const input = html`<script>
      function foo(x) {
        'worklet';
        return x + 2;
      }
    </script>`;

    const { code, files } = runPlugin(input);
    expect(files).toHaveLength(0);
    expect(code).not.toContain('require(');
    expect(code).not.toContain('.worklets');
    expect(code).toMatch(/const foo = function foo_\w+Factory\(\) \{/);
    expect(code).toContain('__workletHash');
    expect(code).toMatchSnapshot();
  });

  test('emits the worklet factory in place for a bundler that is not Metro', () => {
    const input = html`<script>
      const scale = 2;
      function foo(x) {
        'worklet';
        return x * scale;
      }
    </script>`;

    const { code, files } = runPlugin(input, {
      caller: { name: 'babel-loader' },
    });
    expect(files).toHaveLength(0);
    expect(code).not.toContain('require(');
    expect(code).toMatch(/Factory\(\[scale\]\) \{/);
    expect(code).toMatch(/\}\(\[scale\]\);/);
    expect(code).toContain('__closure = [scale]');
  });

  test('keeps a forwardable import as a plain reference in place', () => {
    const input = html`<script>
      import { helper } from 'react-native-worklets';
      function foo() {
        'worklet';
        return helper();
      }
    </script>`;

    const { code, files } = runPlugin(input);
    expect(files).toHaveLength(0);
    expect(code).not.toContain('require(');
    expect(code).not.toContain('__closure');
    expect(code).toMatch(/import \{ helper \} from ["']react-native-worklets["'];/);
    expect(code).toContain('return helper()');
  });

  test('renames the in-place factory when a forwarded import takes its name', () => {
    const input = html`<script>
      import { helper as foo_testJs1Factory } from 'react-native-worklets';
      function foo() {
        'worklet';
        return foo_testJs1Factory();
      }
    </script>`;

    const { code, files } = runPlugin(input);
    expect(files).toHaveLength(0);
    expect(code).toContain('function _foo_testJs1Factory(');
    expect(code).toContain('return foo_testJs1Factory()');
  });

  test('writes worklet files for a Metro caller without inline module support', () => {
    const input = html`<script>
      function foo(x) {
        'worklet';
        return x + 2;
      }
    </script>`;

    const { code, files } = runPlugin(input, {
      caller: { name: 'metro', bundler: 'metro' },
    });
    expect(files).toHaveLength(1);
    expect(code).toContain('require("react-native-worklets/.worklets/');
  });
});

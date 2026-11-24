import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { strict as assert } from 'assert';
import { html } from 'code-tag';
import { join } from 'path';

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

  describe('worklet hash', () => {
    function workletHashes(input: string, filename = MOCK_LOCATION) {
      const { code } = runPlugin(input, { filename: join(__dirname, filename) });
      return [...code.matchAll(/__workletHash = (0x[\da-f]+|\d+)/gi)].map(
        (match) => Number(match[1])
      );
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
        const { code } = runPlugin(input, {
          cwd: join(__dirname, app),
          filename: join(__dirname, app, 'src', 'App.js'),
        });
        return [...code.matchAll(/__workletHash = (0x[\da-f]+|\d+)/gi)].map(
          (match) => Number(match[1])
        );
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
});

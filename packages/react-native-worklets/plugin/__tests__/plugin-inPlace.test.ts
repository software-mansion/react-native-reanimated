import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { strict as assert } from 'assert';
import { html } from 'code-tag';
import * as fs from 'fs';
import * as path from 'path';

import type { PluginOptions } from '../index';
import plugin from '../index';

const MOCK_LOCATION = 'test.js';
const WORKLETS_DIR = path.join(
  path.dirname(require.resolve('react-native-worklets/package.json')),
  '.worklets'
);
const FILE_REQUIRE_PATTERN =
  /require\("react-native-worklets\/\.worklets\/(\d+)\.js"\)\.default/g;

function runPlugin(
  input: string,
  transformOpts: TransformOptions = {},
  pluginOpts: PluginOptions = {}
): string {
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
  return transformed.code ?? '';
}

describe('babel plugin without a Metro caller', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
  });

  test('emits the worklet factory in place without a caller', () => {
    const code = runPlugin(html`<script>
      function foo(x) {
        'worklet';
        return x + 2;
      }
    </script>`);
    expect(code).not.toContain('require(');
    expect(code).not.toContain('.worklets');
    expect(code).not.toContain('metro:inline');
    expect(code).toMatch(/const foo = function foo_\w+Factory\(\) \{/);
    expect(code).toContain('__workletHash');
    expect(code).toMatchSnapshot();
  });

  test('emits the worklet factory in place for a bundler that is not Metro', () => {
    const code = runPlugin(
      html`<script>
        const scale = 2;
        function foo(x) {
          'worklet';
          return x * scale;
        }
      </script>`,
      { caller: { name: 'babel-loader' } }
    );
    expect(code).not.toContain('require(');
    expect(code).toMatch(/Factory\(\[scale\]\) \{/);
    expect(code).toMatch(/\}\(\[scale\]\);/);
    expect(code).toContain('__closure = [scale]');
  });

  test('keeps a forwardable import as a plain reference in place', () => {
    const code = runPlugin(html`<script>
      import { helper } from 'react-native-worklets';
      function foo() {
        'worklet';
        return helper();
      }
    </script>`);
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

    const code = runPlugin(input);
    expect(code).not.toContain('require(');
    expect(code).toContain('function _foo_testJs1Factory(');
    expect(code).toContain('return foo_testJs1Factory()');
  });

  test('writes worklet files for a Metro caller without inline module support', () => {
    const code = runPlugin(
      html`<script>
        function foo(x) {
          'worklet';
          return x + 2;
        }
      </script>`,
      { caller: { name: 'metro', bundler: 'metro' } }
    );
    const hashes = Array.from(code.matchAll(FILE_REQUIRE_PATTERN), ([, h]) => h);
    expect(hashes).toHaveLength(1);
    const file = path.join(WORKLETS_DIR, `${hashes[0]}.js`);
    expect(fs.existsSync(file)).toBe(true);
    fs.rmSync(file);
  });

  test('emits inline modules when the caller supports them', () => {
    const code = runPlugin(
      html`<script>
        function foo(x) {
          'worklet';
          return x + 2;
        }
      </script>`,
      { caller: { name: 'test', supportsInlineModules: true } }
    );
    expect(code).toContain('require("metro:inline;base64,');
    expect(code).not.toContain('.worklets');
  });

  describe('worklet hash', () => {
    function workletHashes(input: string, filename = MOCK_LOCATION) {
      const code = runPlugin(input, { filename: path.join(__dirname, filename) });
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
        const code = runPlugin(input, {
          cwd: path.join(__dirname, app),
          filename: path.join(__dirname, app, 'src', 'App.js'),
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

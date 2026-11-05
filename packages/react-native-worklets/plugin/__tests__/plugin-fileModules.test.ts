import { transformSync } from '@babel/core';
import { strict as assert } from 'assert';
import { html } from 'code-tag';
import * as fs from 'fs';
import * as path from 'path';

import plugin from '../index';

const WORKLETS_DIR = path.join(
  path.dirname(require.resolve('react-native-worklets/package.json')),
  '.worklets'
);
const REQUIRE_PATTERN =
  /require\("react-native-worklets\/\.worklets\/(\d+)\.js"\)\.default/g;

type WrittenModule = { hash: string; content: string };

function runPlugin(
  input: string,
  filename: string = '/some-library/src/file.ts'
): { code: string; modules: WrittenModule[] } {
  const transformed = transformSync(input.replace(/<\/?script[^>]*>/g, ''), {
    filename,
    caller: { name: 'test' },
    compact: false,
    babelrc: false,
    configFile: false,
    plugins: [
      [plugin, { importForwarding: { relativePaths: ['some-library'] } }],
    ],
  });
  assert(transformed);
  const code = transformed.code ?? '';
  const modules = Array.from(code.matchAll(REQUIRE_PATTERN), ([, hash]) => {
    const file = path.join(WORKLETS_DIR, `${hash}.js`);
    const content = fs.readFileSync(file, 'utf8');
    fs.rmSync(file);
    return { hash, content };
  });
  return { code, modules };
}

describe('babel plugin without inline module support', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
  });

  test('writes the worklet module into .worklets and requires it by hash', () => {
    const { code, modules } = runPlugin(html`<script>
      function foo() {
        'worklet';
        return 1;
      }
    </script>`);
    expect(modules).toHaveLength(1);
    expect(code).not.toContain('metro:inline');
    expect(modules[0].content).toMatch(/^"worklet-module";/);
    expect(modules[0].content).toContain(
      'const __workletModuleId = module.id;'
    );
    expect(modules[0].content).toContain('foo.__moduleId = __workletModuleId;');
    const [, printedHash] = modules[0].content.match(
      /foo\.__workletHash = (0x[0-9a-f]+|\d+);/
    )!;
    expect(BigInt(printedHash).toString()).toBe(modules[0].hash);
  });

  test('rebases relative imports and requires against the .worklets directory', () => {
    const { modules } = runPlugin(html`<script>
      import { foo } from './bar';
      function baz() {
        'worklet';
        const helper = require('./helper');
        return foo() + helper();
      }
    </script>`);
    expect(modules).toHaveLength(1);
    const expected = path
      .relative(WORKLETS_DIR, '/some-library/src')
      .split(path.sep)
      .join('/');
    expect(modules[0].content).toContain(`from "${expected}/bar"`);
    expect(modules[0].content).toContain(`require("${expected}/helper")`);
  });
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  INLINE_MODULE_PREFIX,
  materializeInlineModule,
  rebaseInlineModule,
} from '../jest/inlineModuleResolver';

function encode(source: string): string {
  return INLINE_MODULE_PREFIX + Buffer.from(source, 'utf8').toString('base64');
}

describe('inline module resolver', () => {
  test('rebases relative imports, requires and dynamic imports against the importer', () => {
    const rebased = rebaseInlineModule(
      encode(
        [
          "import { a } from './a';",
          "export { b } from '../b';",
          "const c = require('./c');",
          "const d = import('../d');",
          "import { e } from 'some-library';",
        ].join('\n')
      ),
      '/app/src/nested'
    );
    expect(rebased).toContain(`from "/app/src/nested/a"`);
    expect(rebased).toContain(`from "/app/src/b"`);
    expect(rebased).toContain(`require("/app/src/nested/c")`);
    expect(rebased).toContain(`import("/app/src/d")`);
    expect(rebased).toContain(`from "some-library"`);
  });

  test('leaves specifier-like text inside string literals alone', () => {
    const rebased = rebaseInlineModule(
      encode(`const text = "import { x } from './helper'";`),
      '/app/src'
    );
    expect(rebased).toContain(`"import { x } from './helper'"`);
  });

  test('rebases a nested inline module against the original importer', () => {
    const inner = encode(`import { x } from './helper';\nexport default x;`);
    const rebased = rebaseInlineModule(
      encode(`export default require("${inner}").default;`),
      '/app/src'
    );
    const [, payload] = rebased.match(/metro:inline;base64,([A-Za-z0-9+/=]+)/)!;
    expect(Buffer.from(payload, 'base64').toString('utf8')).toContain(
      `from "/app/src/helper"`
    );
  });

  test('writes one file per distinct module under the root', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-modules-'));
    try {
      const request = encode(`"worklet-module";\nexport default 1;`);
      const first = materializeInlineModule(request, {
        basedir: '/app',
        rootDir,
      });
      const second = materializeInlineModule(request, {
        basedir: '/app',
        rootDir,
      });
      expect(second).toBe(first);
      expect(first.startsWith(path.join(rootDir, '.jest-inline-modules'))).toBe(
        true
      );
      expect(fs.readFileSync(first, 'utf8')).toContain('"worklet-module";');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });
});

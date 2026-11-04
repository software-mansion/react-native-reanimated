import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { strict as assert } from 'assert';
import { html } from 'code-tag';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { PluginOptions } from '../index';
import plugin from '../index';
import {
  generatedModules,
  INLINE_MODULE_PREFIX,
  redactGeneratedModules,
} from '../jest/inlineModules';
import { countOccurrences } from '../jest/pluginTestUtils';

const MOCK_LOCATION = 'test.js';
const MOCK_TSX_LOCATION = 'test.tsx';

const REQUIRE_PREFIX = `require("${INLINE_MODULE_PREFIX}`;
const WORKLET_MODULE_DIRECTIVE = /^["']worklet-module["'];/;

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
    plugins: [...(transformOpts.plugins || []), [plugin, pluginOpts]],
  };
  const transformed = transformSync(strippedInput, config);
  assert(transformed);
  const code = transformed.code ?? '';
  return { code, modules: generatedModules(code) };
}

describe('babel plugin in bundleMode', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
  });

  describe('source replacement', () => {
    test.each(['arrow', 'method'])(
      'does not shadow forwarded imports with the closure-free %s worklet binding',
      (kind) => {
        const name = kind === 'arrow' ? 'testJs1' : 'read';
        const body = `{ 'worklet'; return [${name}(), _${name}()]; }`;
        const expression =
          kind === 'arrow' ? `() => ${body}` : `{ read() ${body} }.read`;
        const { modules } = runPlugin(
          `
          import { first as ${name}, second as _${name} } from 'some-library';
          const f = ${expression};
        `,
          {},
          { importForwarding: { moduleNames: ['some-library'] } }
        );
        expect(modules[0].content).toContain(`const __${name} =`);
        expect(modules[0].content).toMatchSnapshot();
      }
    );

    test('packs captures in the same order at the call site and in the factory', () => {
      const { code, modules } = runPlugin(`
        function make(z, missing, a) {
          return (suffix) => {
            'worklet';
            return [z.value, missing, a, suffix];
          };
        }
        module.exports = make;
      `);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(modules[0].content).toMatchSnapshot();
    });

    test('exports closure-free worklets without a factory call', () => {
      const { code, modules } = runPlugin(`
        function factorial(n) {
          'worklet';
          return n <= 1 ? 1 : n * factorial(n - 1);
        }
        module.exports = factorial;
      `);
      expect(code).toMatch(/\.default;/);
      expect(modules[0].content).not.toContain('Factory');
      expect(modules[0].content).not.toContain('__closure');
    });

    test('replaces inline factory with a require of the generated module', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, modules } = runPlugin(input);
      expect(modules).toHaveLength(1);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
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

      const { code, modules } = runPlugin(input);
      expect(modules).toHaveLength(1);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(modules[0].content).toMatchSnapshot();
    });
  });

  describe('worklet module generation', () => {
    test('generates one worklet module per worklet', () => {
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

      const { modules } = runPlugin(input);
      expect(modules).toHaveLength(2);
    });

    test('requires the generated module by its inline specifier', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, modules } = runPlugin(input);
      expect(modules).toHaveLength(1);
      expect(code).toContain(`require("${modules[0].specifier}").default`);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
    });

    test('starts the generated module with the worklet-module directive', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { modules } = runPlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toMatch(WORKLET_MODULE_DIRECTIVE);
    });

    test('records the bundler module id on the worklet', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { modules } = runPlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toContain(
        'const __workletModuleId = module.id;'
      );
      expect(modules[0].content).toContain(
        'foo.__moduleId = __workletModuleId;'
      );
    });

    test('reads the module id before closure variables can shadow module', () => {
      const input = html`<script>
        const module = { id: 'not-metro' };
        const __workletModuleId = 'taken';
        function foo() {
          'worklet';
          return [module.id, __workletModuleId];
        }
      </script>`;

      const { modules } = runPlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toContain(
        'const ___workletModuleId = module.id;'
      );
      expect(modules[0].content).toContain(
        'foo.__moduleId = ___workletModuleId;'
      );
      expect(modules[0].content).toMatchSnapshot();
    });

    test('captures instead of forwarding an import named module', () => {
      const input = html`<script>
        import { foo as module } from 'some-library';
        function bar() {
          'worklet';
          return module.id;
        }
      </script>`;

      const { modules } = runPlugin(
        input,
        {},
        { importForwarding: { moduleNames: ['some-library'] } }
      );
      expect(modules).toHaveLength(1);
      expect(modules[0].content).not.toContain('some-library');
      expect(modules[0].content).toContain(
        'const __workletModuleId = module.id;'
      );
      expect(modules[0].content).toMatch(/Factory\(\[module\]\)/);
      expect(modules[0].content).toContain(
        'bar.__moduleId = __workletModuleId;'
      );
    });

    test('renames a closure-free worklet named module away from the module wrapper binding', () => {
      const input = html`<script>
        function module() {
          'worklet';
          return 1;
        }
      </script>`;

      const { modules } = runPlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).not.toMatch(/const module\b/);
      expect(modules[0].content).toContain(
        'const __workletModuleId = module.id;'
      );
      expect(modules[0].content).toContain('const _module = function');
      expect(modules[0].content).toContain(
        '_module.__moduleId = __workletModuleId;'
      );
      expect(modules[0].content).toContain('export default _module;');
    });

    test('closure-free generated module exports the worklet directly', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
          return x;
        }
      </script>`;

      const { modules } = runPlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toMatchSnapshot();
    });

    test('does not emit init data', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, modules } = runPlugin(input);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(modules[0].content).toMatchSnapshot();
    });

    test('does not emit stack-trace machinery', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { modules } = runPlugin(input);
      expect(modules).toHaveLength(1);
      expect(modules[0].content).not.toContain('__stackDetails');
      expect(modules[0].content).toMatchSnapshot();
    });

    test('generates a worklet module when cwd has no @babel/preset-typescript reachable', () => {
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
        const { modules } = runPlugin(input);
        expect(modules).toHaveLength(1);
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

      const { code, modules } = runPlugin(input);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(modules[0].content).toMatchSnapshot();
    });

    test('preserves workletizable library imports in the generated module', () => {
      const input = html`<script>
        import { foo } from 'some-library';
        function bar() {
          'worklet';
          return foo();
        }
      </script>`;

      const { code, modules } = runPlugin(
        input,
        {},
        { importForwarding: { moduleNames: ['some-library'] } }
      );
      expect(modules).toHaveLength(1);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(modules[0].content).toMatchSnapshot();
    });

    test('strips JSX dev attributes in generated modules', () => {
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

      const { modules } = runPlugin(
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
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toContain('return <ImportedComponent />;');
      expect(modules[0].content).not.toContain('__self');
      expect(modules[0].content).not.toContain('__source');
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
      expect(redactGeneratedModules(code)).toMatchSnapshot();
    });

    test('keeps relative imports as written, since the module resolves from the importer', () => {
      const input = html`<script>
        import { foo } from './bar';
        function baz() {
          'worklet';
          return foo();
        }
      </script>`;

      const { modules } = runPlugin(
        input,
        {},
        { importForwarding: { relativePaths: ['some-library'] } },
        '/some-library/src/file.ts'
      );
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toContain(`from "./bar"`);
    });

    test('keeps relative requires inside the worklet body as written', () => {
      const input = html`<script>
        function baz() {
          'worklet';
          const helper = require('./helper');
          return helper.foo();
        }
      </script>`;

      const { modules } = runPlugin(
        input,
        {},
        { importForwarding: { relativePaths: ['some-library'] } },
        '/some-library/file.js'
      );
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toMatch(/require\(["']\.\/helper["']\)/);
      expect(modules[0].content).toMatchSnapshot();
    });

    test('keeps relative dynamic imports inside the worklet body as written', () => {
      const input = html`<script>
        function baz() {
          'worklet';
          return import('./helper');
        }
      </script>`;

      const { modules } = runPlugin(input, {}, {}, '/some-library/file.js');
      expect(modules).toHaveLength(1);
      expect(modules[0].content).toMatch(/import\(["']\.\/helper["']\)/);
      expect(modules[0].content).toMatchSnapshot();
    });
  });

  describe('nested worklets', () => {
    test('extracts each nested worklet into its own module', () => {
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

      const { code, modules } = runPlugin(input);
      expect(modules).toHaveLength(2);
      const sourceRequires = countOccurrences(code, REQUIRE_PREFIX);
      expect(sourceRequires).toBe(1);
      const [outerModule, innerModule] = modules;
      expect(code).toContain(outerModule.specifier);
      expect(outerModule.content).toContain(innerModule.specifier);
      expect(redactGeneratedModules(code)).toMatchSnapshot();
      expect(redactGeneratedModules(outerModule.content)).toMatchSnapshot();
    });
  });

  describe('bail-out on already-generated worklet modules', () => {
    test('does not re-process a module with the worklet-module directive', () => {
      const input = html`<script>
        'worklet-module';
        function foo() {
          'worklet';
          var x = 1;
        }
      </script>`;

      const { code, modules } = runPlugin(input);
      expect(modules).toHaveLength(0);
      expect(code).not.toContain(REQUIRE_PREFIX);
    });

    test('autoworkletization fires before generating a module', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          scheduleOnUI(() => {
            return 1;
          });
        }
      </script>`;

      const { modules: firstPass } = runPlugin(input);
      assert(firstPass.length >= 1);
      const outerModule = firstPass[0];

      const { code: rePassedCode } = runPlugin(outerModule.content);

      expect(rePassedCode).toContain(REQUIRE_PREFIX);
    });
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);

let babelCore;
try {
  babelCore = require_('@babel/core');
} catch {
}

test(
  'babel shim runs the OXC transform when used as a babel plugin',
  { skip: !babelCore },
  () => {
    const fs = require_('fs');
    const originalWrite = fs.writeFileSync;
    const originalMkdir = fs.mkdirSync;
    fs.writeFileSync = () => {};
    fs.mkdirSync = () => {};
    try {
      delete require_.cache[require_.resolve('../babel.js')];
      const shim = require_('../babel.js');
      const result = babelCore.transformSync(
        `function foo(x) { 'worklet'; return x + 1; }`,
        {
          filename: 'test.js',
          babelrc: false,
          configFile: false,
          plugins: [[shim, { bundleMode: true }]],
        }
      );
      assert.ok(result && result.code);
      assert.match(
        result.code,
        /require\(["']react-native-worklets\/\.worklets\/\d+\.js["']\)\.default/,
        `got:\n${result?.code}`
      );
    } finally {
      fs.writeFileSync = originalWrite;
      fs.mkdirSync = originalMkdir;
      delete require_.cache[require_.resolve('../babel.js')];
    }
  }
);

test(
  'the transform writes emitted bundle files under the worklets package',
  { skip: !babelCore },
  () => {
    const fs = require_('fs');
    const os = require_('os');
    const pathMod = require_('path');
    const packageDir = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'worklets-pkg-'));

    babelCore.transformSync(`function foo(x) { 'worklet'; return x + 1; }`, {
      filename: 'test.js',
      babelrc: false,
      configFile: false,
      plugins: [
        [require_('../babel.js'), { bundleMode: true, workletsPackageDir: packageDir }],
      ],
    });

    const dir = pathMod.join(packageDir, '.worklets');
    const written = fs.readdirSync(dir);
    assert.equal(written.length, 1, `expected one emitted file, got ${written}`);
    assert.match(written[0], /^\d+\.js$/);
    assert.match(
      fs.readFileSync(pathMod.join(dir, written[0]), 'utf8'),
      /__workletHash/
    );
    fs.rmSync(packageDir, { recursive: true, force: true });
  }
);

test(
  'babel shim runs the OXC pipeline without an explicit bundleMode flag',
  { skip: !babelCore },
  () => {
    delete require_.cache[require_.resolve('../babel.js')];
    const shim = require_('../babel.js');
    const result = babelCore.transformSync(
      `function foo(x) { 'worklet'; return x + 1; }`,
      {
        filename: 'test.js',
        babelrc: false,
        configFile: false,
        plugins: [[shim, {}]],
      }
    );
    assert.ok(result && result.code);
    assert.match(result.code, /require\(["']react-native-worklets\/\.worklets/);
  }
);

test(
  'babel shim rejects an explicit bundleMode: false',
  { skip: !babelCore },
  () => {
    delete require_.cache[require_.resolve('../babel.js')];
    const shim = require_('../babel.js');
    assert.throws(
      () =>
        babelCore.transformSync(`function foo() { 'worklet'; return 1; }`, {
          filename: 'test.js',
          babelrc: false,
          configFile: false,
          plugins: [[shim, { bundleMode: false }]],
        }),
      /supports Bundle Mode only/
    );
  }
);

test(
  'babel shim parses JSX in a .js file',
  { skip: !babelCore },
  () => {
    delete require_.cache[require_.resolve('../babel.js')];
    const shim = require_('../babel.js');
    const fs = require_('fs');
    const originalWrite = fs.writeFileSync;
    const originalMkdir = fs.mkdirSync;
    fs.writeFileSync = () => {};
    fs.mkdirSync = () => {};
    let result;
    try {
      result = babelCore.transformSync(
        `import { Comp } from 'react-native-worklets';\nfunction renderView() { 'worklet'; return <Comp />; }`,
        {
          filename: 'plain.js',
          babelrc: false,
          configFile: false,
          plugins: [
            [shim, { importForwarding: { moduleNames: ['react-native-worklets'] } }],
            require_.resolve('@babel/plugin-syntax-jsx'),
          ],
        }
      );
    } finally {
      fs.writeFileSync = originalWrite;
      fs.mkdirSync = originalMkdir;
    }
    assert.ok(result && result.code);
    assert.match(result.code, /require\(["']react-native-worklets\/\.worklets/);
  }
);

test(
  'babel shim leaves generated worklet files alone',
  { skip: !babelCore },
  () => {
    delete require_.cache[require_.resolve('../babel.js')];
    const shim = require_('../babel.js');
    const source = `export default (function f({}) {\n  const g = function () { return <Comp />; };\n  return g;\n});`;
    const result = babelCore.transformSync(source, {
      filename:
        '/repo/packages/react-native-worklets/.worklets/123.js',
      babelrc: false,
      configFile: false,
      plugins: [[shim, {}], require_.resolve('@babel/plugin-syntax-jsx')],
    });
    assert.ok(result && result.code);
    assert.match(result.code, /<Comp \/>/);
  }
);

test(
  'babel shim recovers from unparseable files without worklets',
  { skip: !babelCore },
  () => {
    delete require_.cache[require_.resolve('../babel.js')];
    const shim = require_('../babel.js');
      const result = babelCore.transformSync('const a = (x: number): number => x;', {
      filename: 'flowish.js',
      babelrc: false,
      configFile: false,
      plugins: [[shim, {}], require_.resolve('@babel/plugin-syntax-flow')],
    });
    assert.ok(result && result.code);
    assert.match(result.code, /const a =/);
  }
);

test(
  'babel shim refuses to silently skip an unparseable worklet file',
  { skip: !babelCore },
  () => {
    delete require_.cache[require_.resolve('../babel.js')];
    const shim = require_('../babel.js');
    assert.throws(
      () =>
        babelCore.transformSync(
          'function f(x: number) { \'worklet\'; return x; }\nconst b = (y: number): number => y;',
          {
            filename: 'flowish-worklet.js',
            babelrc: false,
            configFile: false,
            plugins: [[shim, {}], require_.resolve('@babel/plugin-syntax-flow')],
          }
        ),
      /contains worklets but could not be parsed/
    );
  }
);

test(
  'babel shim refuses to silently skip an unparseable auto-workletized file',
  { skip: !babelCore },
  () => {
    delete require_.cache[require_.resolve('../babel.js')];
    const shim = require_('../babel.js');
    assert.throws(
      () =>
        babelCore.transformSync(
          'const s = useAnimatedStyle(() => ({ width: 1 }));\nconst b = (y: number): number => y;',
          {
            filename: 'flowish-hook.js',
            babelrc: false,
            configFile: false,
            plugins: [[shim, {}], require_.resolve('@babel/plugin-syntax-flow')],
          }
        ),
      /contains worklets but could not be parsed/
    );
  }
);

test('the parse-failure net takes its callee list from the Rust tables', () => {
  const { hooks, methods } = require_('../index.js').workletSourceTokens();
  assert.ok(hooks.length > 20, `too few hooks: ${hooks.length}`);
  assert.ok(methods.length > 5, `too few methods: ${methods.length}`);
  for (const name of ['useAnimatedStyle', 'runOnUI', 'useTapGesture']) {
    assert.ok(hooks.includes(name), `missing hook: ${name}`);
  }
  for (const name of ['withCallback', 'onStart']) {
    assert.ok(methods.includes(name), `missing method: ${name}`);
  }
});

test(
  'the parse-failure net does not fire on ordinary React callbacks',
  { skip: !babelCore },
  () => {
  const shim = require_('../babel.js');
  const flow = 'function f(x: ?number) {}\n';
  const run = (source) =>
    babelCore.transformSync(source, {
      filename: 'test.js',
      babelrc: false,
      configFile: false,
      parserOpts: { plugins: ['flow'] },
      plugins: [[shim, { bundleMode: true }]],
    });

  run(`${flow}props.onChange(1);`);
  run(`${flow}this.onUpdate();`);

  assert.throws(
    () =>
      run(
        `${flow}import { Gesture } from 'react-native-gesture-handler';\n` +
          `Gesture.Tap().onStart(() => {});`
      ),
    /contains worklets but could not be parsed/
  );
  assert.throws(
    () => run(`${flow}useAnimatedStyle(() => ({}));`),
    /contains worklets but could not be parsed/
  );
  }
);

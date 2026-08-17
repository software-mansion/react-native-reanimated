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
  'babel shim writes emitted bundle files to disk',
  { skip: !babelCore },
  () => {
    const fs = require_('fs');
    const captured = [];
    const original = fs.writeFileSync;
    fs.writeFileSync = (filepath, content) => {
      captured.push({ path: String(filepath), content: String(content) });
    };
    const originalMkdir = fs.mkdirSync;
    fs.mkdirSync = () => {};

    try {
      delete require_.cache[require_.resolve('../babel.js')];
      const shim = require_('../babel.js');
      babelCore.transformSync(`function foo(x) { 'worklet'; return x + 1; }`, {
        filename: 'test.js',
        babelrc: false,
        configFile: false,
        plugins: [[shim, { bundleMode: true }]],
      });
    } finally {
      fs.writeFileSync = original;
      fs.mkdirSync = originalMkdir;
      delete require_.cache[require_.resolve('../babel.js')];
    }

    assert.equal(captured.length, 1, 'expected one emitted file');
    assert.match(
      captured[0].path,
      /\.worklets[\\/]\d+\.js$/,
      `bad path: ${captured[0].path}`
    );
    assert.match(
      captured[0].content,
      /__workletHash/,
      `bad content:\n${captured[0].content}`
    );
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

test('the parse-failure net lists every callee the Rust tables auto-workletize', () => {
  const fs = require_('node:fs');
  const read = (name) =>
    fs.readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
  const shim = fs.readFileSync(new URL('../babel.js', import.meta.url), 'utf8');
  const listed = new Set(
    [...shim.matchAll(/^\s*'([A-Za-z]+)',$/gm)].map((m) => m[1])
  );

  const constBody = (source, name) =>
    source.slice(source.indexOf(`${name}:`)).split('];')[0];
  const referenced = read('referenced_worklets.rs');
  const autoDetect = read('auto_detect.rs');
  const expected = [
    ...constBody(referenced, 'const FUNCTION_HOOKS').matchAll(/\("([A-Za-z]+)"/g),
    ...constBody(autoDetect, 'const GESTURE_HANDLER_OBJECT_HOOKS').matchAll(/"([A-Za-z]+)"/g),
    ...constBody(autoDetect, 'const GESTURE_HANDLER_BUILDER_METHODS').matchAll(/"([A-Za-z]+)"/g),
    ...constBody(autoDetect, 'const LAYOUT_ANIMATION_CALLBACKS').matchAll(/"([A-Za-z]+)"/g),
  ].map((m) => m[1]);

  assert.ok(expected.length > 30, `parsed too few names: ${expected.length}`);
  const missing = expected.filter((name) => !listed.has(name));
  assert.deepEqual(missing, [], `babel.js is missing: ${missing.join(', ')}`);

  const marker = shim.match(/CONTEXT_OBJECT_MARKER = '([^']+)'/)[1];
  assert.match(
    read('context_object.rs'),
    new RegExp(`CONTEXT_OBJECT_MARKER: &str = "${marker}"`)
  );
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

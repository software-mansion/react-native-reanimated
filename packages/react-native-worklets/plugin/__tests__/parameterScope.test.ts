import { transformSync } from '@babel/core';
import { strict as assert } from 'assert';
import plugin from 'react-native-worklets/plugin';

type Callable = (...args: unknown[]) => unknown;

interface WorkletHost {
  readonly __closure: ReadonlyArray<unknown>;
  readonly _recur: Callable;
}

interface JavaScriptWorklet {
  readonly __closure?: ReadonlyArray<unknown>;
  readonly __initData: { readonly code: string };
}

function transformWithPlugin(source: string): string {
  const transformed = transformSync(source, {
    filename: '/dev/null',
    compact: false,
    babelrc: false,
    configFile: false,
    plugins: [[plugin, {}]],
  });
  assert(transformed?.code);
  return transformed.code;
}

/**
 * The worklet as the UI runtime calls it: its code string compiled in the
 * global scope, with `this` carrying the closure and the recursion binding.
 */
function compileWorklet(source: string, name: string): Callable {
  const javaScriptWorklet = new Function(
    'global',
    `${transformWithPlugin(source)}\nreturn ${name};`
  )(globalThis) as JavaScriptWorklet;
  const evaluated = new Function(
    `return ${javaScriptWorklet.__initData.code}`
  )() as (this: WorkletHost, ...args: unknown[]) => unknown;
  const host: WorkletHost = {
    __closure: javaScriptWorklet.__closure ?? [],
    _recur: (...args) => evaluated.apply(host, args),
  };
  return host._recur;
}

function runNatively(source: string, name: string): Callable {
  return new Function(
    `${source.replaceAll("'worklet';", '')}\nreturn ${name};`
  )() as Callable;
}

const SHAPES = [
  {
    shape: 'a default reads a capture',
    name: 'clamp',
    source: `const DEFAULTS = { max: 8 };
      function clamp(value, limits = DEFAULTS) { 'worklet'; return Math.min(value, limits.max); }`,
    args: [20],
  },
  {
    shape: 'a later default reads an earlier one that reads a capture',
    name: 'span',
    source: `const DEFAULTS = { max: 8 };
      function span(first = DEFAULTS, second = first) { 'worklet'; return first.max + second.max; }`,
    args: [],
  },
  {
    shape: 'defaults with side effects run in source order',
    name: 'ordered',
    source: `const log = [];
      const DEFAULTS = { max: 8 };
      function mark(label, value) { 'worklet'; log.push(label); return value; }
      function ordered(first = mark('first', DEFAULTS), second = mark('second', 2)) { 'worklet'; return [first.max, second, log.splice(0)]; }`,
    args: [],
  },
  {
    shape: 'a destructuring default reads a capture',
    name: 'ease',
    source: `const DEFAULT_EASING = 0.42;
      function ease({ travel, easing = DEFAULT_EASING }) { 'worklet'; return travel * easing; }`,
    args: [{ travel: 10 }],
  },
  {
    shape: 'a nested pattern default reads a capture',
    name: 'nested',
    source: `const DEFAULT_MAX = 3;
      function nested({ limits: { max = DEFAULT_MAX } = {} } = {}) { 'worklet'; return max; }`,
    args: [],
  },
  {
    shape: 'a computed key reads a capture',
    name: 'readAxis',
    source: `const AXIS_KEY = 'x';
      function readAxis({ [AXIS_KEY]: axis }) { 'worklet'; return axis; }`,
    args: [{ x: 7 }],
  },
  {
    shape: 'a rest pattern default reads a capture',
    name: 'restDefault',
    source: `const DEFAULTS = { max: 8 };
      function restDefault(...[limits = DEFAULTS]) { 'worklet'; return limits.max; }`,
    args: [],
  },
  {
    shape: 'the body redeclares the defaulted parameter with var',
    name: 'redeclared',
    source: `const DEFAULTS = { max: 8 };
      function redeclared(limits = DEFAULTS) { 'worklet'; var limits; return limits.max; }`,
    args: [],
  },
  {
    shape: "a default reads the worklet's own name",
    name: 'countDown',
    source: `const STEP = 2;
      function countDown(depth, next = countDown) { 'worklet'; return depth === 0 ? 0 : STEP + next(depth - 1); }`,
    args: [3],
  },
  {
    shape: 'a default constructs a captured worklet class',
    name: 'make',
    source: `class Limits { __workletClass = true; max = 8; }
      function make(limits = new Limits()) { 'worklet'; return limits.max; }`,
    args: [],
  },
  {
    shape: 'a function expression in a default reads a capture',
    name: 'lazy',
    source: `const DEFAULTS = { max: 8 };
      function lazy(read = function () { return DEFAULTS.max; }) { 'worklet'; return read(); }`,
    args: [],
  },
  {
    shape: 'an object method in a default reads a capture',
    name: 'method',
    source: `const DEFAULTS = { max: 8 };
      function method(source = { read() { return DEFAULTS.max; } }) { 'worklet'; return source.read(); }`,
    args: [],
  },
  {
    shape: 'an arrow function in a default reads a capture',
    name: 'arrow',
    source: `const DEFAULTS = { max: 8 };
      function arrow(read = () => DEFAULTS.max) { 'worklet'; return read(); }`,
    args: [],
  },
  {
    shape: 'a shorthand property in a default reads a capture',
    name: 'shorthand',
    source: `const DEFAULTS = { max: 8 };
      function shorthand(options = { DEFAULTS }) { 'worklet'; return options.DEFAULTS.max; }`,
    args: [],
  },
  {
    shape: 'an inner parameter shadows a capture',
    name: 'shadowed',
    source: `const DEFAULTS = { max: 8 };
      function shadowed(read = (DEFAULTS) => DEFAULTS.max) { 'worklet'; return read({ max: 5 }) + DEFAULTS.max; }`,
    args: [],
  },
  {
    shape: 'a declaration inside a default shadows a capture',
    name: 'declared',
    source: `const DEFAULTS = { max: 8 };
      function declared(read = () => { const DEFAULTS = { max: 5 }; return DEFAULTS.max; }) { 'worklet'; return read() + DEFAULTS.max; }`,
    args: [],
  },
  {
    shape: 'a default reads an earlier parameter only',
    name: 'distance',
    source: `function distance(from, to = from) { 'worklet'; return to - from; }`,
    args: [4],
  },
  {
    shape: 'a capture named as a non-computed key',
    name: 'keyed',
    source: `const min = 1;
      function keyed({ min: renamed }) { 'worklet'; return renamed + min; }`,
    args: [{ min: 5 }],
  },
] as const;

describe('a worklet parameter that reads a binding the body declares', () => {
  test.each(SHAPES)('$shape', ({ source, name, args }) => {
    expect(compileWorklet(source, name)(...args)).toEqual(
      runNatively(source, name)(...args)
    );
  });

  test('a function in a default that declares the name itself is left as written', () => {
    expect(
      transformWithPlugin(`const DEFAULTS = { max: 8 };
      function shadowed(read = (DEFAULTS) => DEFAULTS.max) { 'worklet'; return read({ max: 5 }) + DEFAULTS.max; }`)
    ).toContain('read=function(DEFAULTS){return DEFAULTS.max;}');
  });
});

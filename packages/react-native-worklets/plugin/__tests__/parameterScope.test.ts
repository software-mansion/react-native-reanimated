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
    filename: __filename,
    compact: false,
    babelrc: false,
    configFile: false,
    plugins: [[plugin, {}]],
  });
  assert(transformed?.code);
  return transformed.code;
}

/** The worklet's code string compiled in the global scope, as the UI runtime compiles it. */
function evaluateWorklet(
  source: string,
  name: string
): {
  readonly javaScriptWorklet: JavaScriptWorklet;
  readonly evaluated: (this: WorkletHost, ...args: unknown[]) => unknown;
} {
  const javaScriptWorklet = new Function(
    'global',
    `${transformWithPlugin(source)}\nreturn ${name};`
  )(globalThis) as JavaScriptWorklet;
  const evaluated = new Function(
    `return ${javaScriptWorklet.__initData.code}`
  )() as (this: WorkletHost, ...args: unknown[]) => unknown;
  return { javaScriptWorklet, evaluated };
}

/** The worklet as the UI runtime calls it, with `this` carrying the closure and the recursion binding. */
function compileWorklet(source: string, name: string): Callable {
  const { javaScriptWorklet, evaluated } = evaluateWorklet(source, name);
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
    shape: 'a recursive call reads its default from a capture again',
    name: 'descend',
    source: `const DEFAULTS = { max: 8 };
      function descend(depth, limits = DEFAULTS) { 'worklet'; return depth === 0 ? limits.max : descend(depth - 1); }`,
    args: [2],
  },
  {
    shape: 'the body reads the arguments of the call',
    name: 'given',
    source: `const DEFAULTS = { max: 8 };
      function given(value, limits = DEFAULTS) { 'worklet'; return [arguments.length, value, limits.max]; }`,
    args: [5],
  },
  {
    shape: 'a default constructs a captured worklet class',
    name: 'make',
    source: `class Limits { __workletClass = true; max = 8; }
      function make(limits = new Limits()) { 'worklet'; return limits.max; }`,
    args: [],
  },
  {
    shape: 'a default constructs the class the body checks against',
    name: 'same',
    source: `class Limits { __workletClass = true; max = 8; }
      function same(limits = new Limits()) { 'worklet'; return limits instanceof Limits; }`,
    args: [],
  },
  {
    shape: 'two defaults construct one worklet class',
    name: 'pair',
    source: `class Limits { __workletClass = true; max = 8; }
      function pair(first = new Limits(), second = new Limits()) { 'worklet'; return first.constructor === second.constructor; }`,
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
    shape: 'an optional chain and a nullish default read captures',
    name: 'pick',
    source: `const CONFIG = { limits: undefined };
      const FALLBACK = 3;
      function pick(limit = CONFIG?.limits ?? FALLBACK) { 'worklet'; return limit; }`,
    args: [],
  },
  {
    shape: 'a template literal default reads a capture',
    name: 'size',
    source: `const UNIT = 'px';
      function size(value, text = \`\${value}\${UNIT}\`) { 'worklet'; return text; }`,
    args: [4],
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

const SHADOWED_SHAPES = [
  {
    shape: 'the body redeclares the name with const',
    name: 'pick',
    source: `const LIMIT = 5;
      function pick(value = LIMIT) { 'worklet'; const LIMIT = 1; return [value, LIMIT]; }`,
    args: [],
  },
  {
    shape: 'the body redeclares the name with var',
    name: 'pick',
    source: `const LIMIT = 5;
      function pick(value = LIMIT) { 'worklet'; var LIMIT = 1; return [value, LIMIT]; }`,
    args: [],
  },
  {
    shape: 'the body declares a function of the same name',
    name: 'pick',
    source: `const LIMIT = 5;
      function pick(value = LIMIT) { 'worklet'; function LIMIT() { return 1; } return [value, LIMIT()]; }`,
    args: [],
  },
  {
    shape: 'a destructuring default reads the shadowed name',
    name: 'pick',
    source: `const LIMIT = 5;
      function pick({ limit = LIMIT } = {}) { 'worklet'; const LIMIT = 1; return [limit, LIMIT]; }`,
    args: [],
  },
  {
    shape: 'a computed key reads the shadowed name',
    name: 'read',
    source: `const KEY = 'x';
      function read({ [KEY]: value }) { 'worklet'; const KEY = 'y'; return [value, KEY]; }`,
    args: [{ x: 7, y: 8 }],
  },
  {
    shape: 'a function in a default reads the shadowed name',
    name: 'pick',
    source: `const LIMIT = 5;
      function pick(read = () => LIMIT) { 'worklet'; const LIMIT = 1; return [read(), LIMIT]; }`,
    args: [],
  },
  {
    shape: 'an arrow worklet whose body shadows the name',
    name: 'pick',
    source: `const LIMIT = 5;
      const pick = (value = LIMIT) => { 'worklet'; const LIMIT = 1; return [value, LIMIT]; };`,
    args: [],
  },
] as const;

describe('a parameter reading a module binding the body shadows', () => {
  test.each(SHADOWED_SHAPES)('$shape', ({ source, name, args }) => {
    expect(compileWorklet(source, name)(...args)).toEqual(
      runNatively(source, name)(...args)
    );
  });
});

describe('worklet parameters', () => {
  test.each(SHAPES)('$shape', ({ source, name, args }) => {
    expect(compileWorklet(source, name)(...args)).toEqual(
      runNatively(source, name)(...args)
    );
  });

  test("a generator worklet's default reads a capture", () => {
    const source = `const DEFAULTS = { max: 8 };
      function* steps(limits = DEFAULTS) { 'worklet'; yield limits.max; yield limits.max + 1; }`;
    expect(
      Array.from(compileWorklet(source, 'steps')() as Iterable<unknown>)
    ).toEqual(Array.from(runNatively(source, 'steps')() as Iterable<unknown>));
  });

  test("an async worklet's default reads a capture", async () => {
    const source = `const DEFAULTS = { max: 8 };
      async function delayed(limits = DEFAULTS) { 'worklet'; return (await limits).max; }`;
    const compiled = compileWorklet(source, 'delayed')();
    expect(compiled).toBeInstanceOf(Promise);
    expect(await compiled).toEqual(await runNatively(source, 'delayed')());
  });

  test('the body runs with the worklet as this', () => {
    const source = `const DEFAULTS = { max: 8 };
      function self(limits = DEFAULTS) { 'worklet'; return this; }`;
    const { javaScriptWorklet, evaluated } = evaluateWorklet(source, 'self');
    const host: WorkletHost = {
      __closure: javaScriptWorklet.__closure ?? [],
      _recur: (...args) => evaluated.apply(host, args),
    };
    expect(evaluated.call(host)).toBe(host);
  });

  test('the worklet keeps its parameter count', () => {
    const source = `const DEFAULTS = { max: 8 };
      function counted(value, limits = DEFAULTS, ...rest) { 'worklet'; return value + limits.max + rest.length; }`;
    expect(evaluateWorklet(source, 'counted').evaluated.length).toBe(
      runNatively(source, 'counted').length
    );
  });

  test.each([
    {
      shape: 'a function in a default that declares the name itself',
      name: 'shadowed',
      source: `const DEFAULTS = { max: 8 };
      function shadowed(read = (DEFAULTS) => DEFAULTS.max) { 'worklet'; return read({ max: 5 }) + DEFAULTS.max; }`,
      parameters: '(read=function(DEFAULTS){return DEFAULTS.max;})',
    },
    {
      shape: 'a default that reads an earlier parameter',
      name: 'distance',
      source: `function distance(from, to = from) { 'worklet'; return to - from; }`,
      parameters: '(from,to=from)',
    },
  ])('$shape is left as written', ({ source, name, parameters }) => {
    const { code } = evaluateWorklet(source, name).javaScriptWorklet.__initData;
    const workletName = /^\(function (\w+)\(/.exec(code)?.[1];
    expect(code).toContain(`${workletName}${parameters}{`);
  });
});

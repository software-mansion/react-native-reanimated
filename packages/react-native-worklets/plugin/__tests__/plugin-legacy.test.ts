import '../src/jestMatchers';

import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import traverse from '@babel/traverse';
import { strict as assert } from 'assert';
import { html } from 'code-tag';
import type { PluginOptions } from 'react-native-worklets/plugin';
import plugin from 'react-native-worklets/plugin';

import { version as packageVersion } from '../../package.json';

const MOCK_LOCATION = '/dev/null';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  const nodePath = jest.requireActual('path');
  const target = nodePath.resolve('/dev/null');
  return {
    ...actual,
    readFileSync: (file: unknown, ...args: unknown[]) =>
      typeof file === 'string' && nodePath.resolve(file) === target
        ? Buffer.from('')
        : actual.readFileSync(file, ...args),
  };
});

expect.addSnapshotSerializer({
  test: (v: unknown): v is string =>
    typeof v === 'string' &&
    (v.includes('\\\\') || /(?<![A-Za-z])[A-Za-z]:[/\\]/.test(v)),
  serialize: (v, c, i, d, r, printer) =>
    printer(
      (v as string)
        .replace(/(?<![A-Za-z])[A-Za-z]:[\\/]+/g, '/')
        .replace(/\\\\/g, '/'),
      c,
      i,
      d,
      r
    ),
});

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
  return transformed;
}

/**
 * A worklet the UI runtime would evaluate, as a callable — `this` is its host
 * object.
 *
 * The host carries `__closure` and whatever else a test hands the worklet to
 * reach. `this` is the one channel into a `new Function` scope that costs
 * nothing outside the call, which is what keeps a worklet that records its own
 * evaluation order from writing to a global every later test can see.
 */
type WorkletHost = {
  __closure: Record<string, unknown>;
  [property: string]: unknown;
};

type EvaluatedWorklet = (this: WorkletHost) => unknown;

/**
 * The serialized worklet out of the emitted `__initData`, compiled and ready to
 * call.
 *
 * `__initData.code` is the exact string the UI runtime evaluates, and `new
 * Function` compiles it in the GLOBAL scope — so a captured binding is
 * reachable through `this.__closure` and through nothing else. That is what
 * makes a call here mean what a call on the UI thread means: a scope that
 * already holds the capture cannot observe a worklet that fails to reach it.
 */
function evaluateWorkletCode(transformedCode: string): EvaluatedWorklet {
  const match = /code: (?<literal>"(?:[^"\\]|\\.)*")/u.exec(transformedCode);
  assert(match?.groups?.literal, 'no worklet `code` in the transformed output');
  const workletSource: unknown = JSON.parse(match.groups.literal);
  assert(typeof workletSource === 'string', '`code` is not a string');

  return new Function(`return ${workletSource}`)() as EvaluatedWorklet;
}

describe('babel plugin', () => {
  beforeEach(() => {
    process.env.WORKLETS_JEST_SHOULD_MOCK_SOURCE_MAP = '1';
    process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '1';
  });

  describe('closure-dependent parameters', () => {
    test('hoists a default that reads a captured binding into the body', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function clamp(value, limits = DEFAULTS) {
          'worklet';
          return Math.min(value, limits.max);
        }
      </script>`;

      const { code } = runPlugin(input);

      // The capture is destructured at the top of the BODY, and a parameter default is evaluated
      // in the PARAMETER scope, which by specification cannot see a body declaration. Leaving the
      // default in place emits a function that throws ReferenceError on every call that omits the
      // argument — on the UI thread, an uncaught C++ exception.
      // The whole fix, in the emitted body: the parameter carries a placeholder and the default
      // is resolved AFTER the closure destructure, where the capture actually exists.
      //
      // The placeholder carries no digit. `Scope#generateUid` strips trailing digits from the
      // requested name, so a parameter index cannot reach the output; where a digit DOES appear
      // it is that function's collision counter, never the position.
      expect(code).toContain(
        '(value,_workletParameter){const{DEFAULTS}=this.__closure;let limits=_workletParameter===void 0?DEFAULTS:_workletParameter;'
      );
    });

    test('hoists a parameter that depends on an already-hoisted parameter', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function span(first = DEFAULTS, second = first) {
          'worklet';
          return first.max + second.max;
        }
      </script>`;

      const { code } = runPlugin(input);

      // Hoisting `first` moves its binding into the body, so `second` is left reading a name
      // parameter scope no longer has — the same ReferenceError, one parameter over. The rule is
      // transitive for exactly this reason.
      // Both parameters land in the body, in declaration order, so `second` resolves `first`
      // from the body binding rather than from a parameter scope that no longer has it.
      //
      // `_workletParameter` then `_workletParameter2` is `generateUid` avoiding a collision with
      // the name it just handed out — the counter skips 1 — and not the parameter positions,
      // which are 0 and 1.
      expect(code).toContain(
        'let first=_workletParameter===void 0?DEFAULTS:_workletParameter;let second=_workletParameter2===void 0?first:_workletParameter2;'
      );
    });

    test('leaves a default that reads an earlier parameter alone', () => {
      const input = html`<script>
        function distance(from, to = from) {
          'worklet';
          return to - from;
        }
      </script>`;

      const { code } = runPlugin(input);

      // Parameter scope can legitimately see an earlier parameter, and this worklet captures
      // nothing, so rewriting it would be a change with no cause.
      expect(code).not.toContain('_workletParameter');
    });

    test('hoists a LATER parameter that captures nothing, so evaluation order is preserved', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function span(first = DEFAULTS, second = globalThis.fallback()) {
          'worklet';
          return first.max + second;
        }
      </script>`;

      const { code } = runPlugin(input);

      // `second` reads a global, so it captures nothing and nothing about SCOPE forces it to move.
      // Order does: every parameter expression runs before the body, so leaving `second` behind
      // would run it BEFORE `first`, which now lives in the body. The source says `first` then
      // `second`, and a transform that silently swaps two side effects is a defect no return value
      // reveals — which is why the assertion is on the emitted order rather than on a result.
      expect(code).toContain(
        'let first=_workletParameter===void 0?DEFAULTS:_workletParameter;let second=_workletParameter2===void 0?globalThis.fallback():_workletParameter2;'
      );
    });

    test('leaves a plain identifier after a hoisted parameter alone', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function span(first = DEFAULTS, second) {
          'worklet';
          return first.max + second;
        }
      </script>`;

      const { code } = runPlugin(input);

      // The order rule is bounded by what a parameter EVALUATES, not by where it sits. An
      // identifier binds the argument and runs nothing, so it has no side effect to reorder and
      // moving it would be churn. Its slot stays exactly where it was written.
      expect(code).toContain('(_workletParameter,second){');
    });

    test('hoists a DEFAULTLESS pattern after a hoisted parameter — destructuring is observable', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function span(first = DEFAULTS, { max }) {
          'worklet';
          return first.max + max;
        }
      </script>`;

      const { code } = runPlugin(input);

      // A pattern with no default still evaluates in the parameter scope: it reads properties and
      // drives the iterator protocol, both of which can run user code through a getter. So the
      // order rule keys on "evaluates something", never on "carries a default" — the narrower
      // reading would leave a getter firing on the wrong side of the hoisted parameter.
      expect(code).toContain(
        'let first=_workletParameter===void 0?DEFAULTS:_workletParameter;let{max:max}=_workletParameter2;'
      );
    });

    test('hoists a destructuring pattern WHOLE, keeping its nested defaults', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8, min: 1 };

        function span({ min, max } = DEFAULTS) {
          'worklet';
          return max - min;
        }
      </script>`;

      const { code } = runPlugin(input);

      // The pattern moves intact rather than being decomposed, so nested defaults, computed keys
      // and throw-on-`undefined` destructuring semantics are all unchanged — the only thing that
      // moves is WHERE the binding happens.
      expect(code).toContain(
        // Shorthand properties are expanded by the generator, so the serialized body spells the
        // pattern `{min:min,max:max}` — asserted as emitted rather than as authored.
        'let{min:min,max:max}=_workletParameter===void 0?DEFAULTS:_workletParameter;'
      );
    });

    test('hoists a pattern whose NESTED default reads a capture', () => {
      const input = html`<script>
        const DEFAULTS = { min: 1 };

        function low({ min = DEFAULTS.min }) {
          'worklet';
          return min;
        }
      </script>`;

      const { code } = runPlugin(input);

      // The parameter itself carries no default; the capture is read from inside the pattern. A
      // check that only looked at `AssignmentPattern` at the top level would miss it entirely.
      expect(code).toContain('let{min=DEFAULTS.min}=_workletParameter;');
    });

    test('replaces a rest element ARGUMENT, so the rest keeps collecting', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function first(...[limits = DEFAULTS]) {
          'worklet';
          return limits.max;
        }
      </script>`;

      const { code } = runPlugin(input);

      // `...rest` binds a plain identifier and cannot carry a default, so it has nothing to hoist.
      // `...[a = CAPTURED]` is a pattern and does — and there the placeholder replaces the rest
      // ARGUMENT, never the parameter, because the rest element itself has to go on collecting the
      // remaining arguments. Overwriting the parameter would silently drop every argument past
      // that position.
      expect(code).toContain('(..._restPattern){');
      expect(code).toContain('let[limits=DEFAULTS]=_restPattern;');
    });

    test('a capture in a non-computed KEY position is not a reference to it', () => {
      const input = html`<script>
        const min = 1;

        function rename({ min: renamed }) {
          'worklet';
          return renamed + min;
        }
      </script>`;

      const { code } = runPlugin(input);

      // `{ min: renamed }` names a property, not the binding `min`. Rewriting on a key match would
      // hoist a parameter that depends on nothing, which is a behaviour change with no cause.
      expect(code).toContain('({min:renamed})');
      expect(code).not.toContain('_workletParameter');
    });

    test('hoists NOTHING when the body redeclares a hoistable parameter with `var`', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function shadow(limits = DEFAULTS) {
          'worklet';
          var limits;
          return 1;
        }
      </script>`;

      const { code } = runPlugin(input);

      // `var x` may legally redeclare a PARAMETER and may not redeclare a `let`, so hoisting this
      // one emits `let limits; var limits;` — a SyntaxError, failing on every call rather than only
      // the defaulting one. That is strictly worse than the defect being fixed, so the whole plan
      // is refused and the output matches upstream's exactly. The floor for this function is "no
      // worse than unpatched", never "broken differently".
      expect(code).toContain('(limits=DEFAULTS){');
      expect(code).not.toContain('_workletParameter');
    });

    test('a BLOCKED plan hoists nothing, including the parameters that could have moved', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function cascade(limits = DEFAULTS, scale = limits.max) {
          'worklet';
          var scale;
          return scale;
        }
      </script>`;

      const { code } = runPlugin(input);

      // `limits` alone is hoistable and `scale` is not. Moving only `limits` would leave `scale`
      // reading a name that is no longer in parameter scope — the original defect at a NEW trigger,
      // on a call that worked before the patch. All or nothing is what makes that unrepresentable.
      expect(code).toContain('(limits=DEFAULTS,scale=limits.max){');
      expect(code).not.toContain('_workletParameter');
    });

    test("hoists a default that calls the worklet's OWN name, past the recursion binding", () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function walk(depth, next = walk) {
          'worklet';
          return depth > 0 ? next(depth - 1) : DEFAULTS.max;
        }
      </script>`;

      const { code } = runPlugin(input);

      // `prependRecursiveDeclaration` shadows a self-referencing worklet's own name with
      // `const <name> = this._recur;` INSIDE the body. A default that calls the worklet therefore
      // resolves, from parameter scope, to the bare function expression and invokes it with no
      // `this` — whose body reads `this.__closure` first. The recursion binding counts as body
      // scope for exactly that reason.
      expect(code).toContain('=this._recur;');
      expect(code).toContain('_workletParameter===void 0?');
    });

    test('the same shape hoists in a worklet that captures NOTHING', () => {
      const input = html`<script>
        function walk(depth, next = walk) {
          'worklet';
          return depth > 0 ? next(depth - 1) : 0;
        }
      </script>`;

      const { code } = runPlugin(input);

      // The recursion binding exists whether or not anything was captured, so gating the hoist on
      // the closure count made two otherwise-identical worklets differ by one captured constant.
      expect(code).toContain('=this._recur;');
      expect(code).toContain('_workletParameter===void 0?');
    });

    test('the hoisted binding is `let`, so a body may reassign its own parameter', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function bump(limits = DEFAULTS) {
          'worklet';
          limits = { max: limits.max + 1 };
          return limits.max;
        }
      </script>`;

      const { code } = runPlugin(input);

      // A parameter is assignable, so the binding that replaces it must be too. `const` here is
      // observable only as the "Assignment to constant variable" it throws at call time, which is
      // why the emitted keyword is asserted rather than inferred.
      expect(code).toContain(
        'let limits=_workletParameter===void 0?DEFAULTS:_workletParameter;'
      );
    });

    test('the parameter COUNT is preserved — one parameter becomes one placeholder', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function clamp(value, limits = DEFAULTS) {
          'worklet';
          return Math.min(value, limits.max);
        }
      </script>`;

      const { code } = runPlugin(input);

      // `arguments` is indexed by position, so a hoisted parameter must leave its slot occupied
      // rather than vanish from the list.
      //
      // `Function.prototype.length` is the one observable this DOES move, and it moves by
      // construction: it counts the parameters before the first default, so replacing a defaulted
      // parameter with a plain placeholder raises it — measured 1 -> 2 for this function. Nothing
      // in this package reads a worklet's arity, and the alternative is the ReferenceError, so the
      // trade is deliberate rather than overlooked. It is pinned here so a future change to the
      // placeholder shape cannot move it further without saying so.
      expect(code).toContain('(value,_workletParameter){');
      expect(code).not.toContain('(value){');
    });

    test('the placeholder cannot collide with a name the body already declares', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function collide(limits = DEFAULTS) {
          'worklet';
          const _workletParameter = 7;
          return limits.max + _workletParameter;
        }
      </script>`;

      const { code } = runPlugin(input);

      // A raw identifier would emit two `_workletParameter` bindings in one scope, which does not
      // parse. `generateUid` re-suffixes until the name is free across the whole program.
      expect(code).toContain('_workletParameter2');
    });

    test('a default that CONSTRUCTS a captured worklet class hoists', () => {
      const input = html`<script>
        class Limits {
          constructor() {
            this.max = 8;
          }
        }

        function clamp(scale, limits = new Limits()) {
          'worklet';
          return Math.min(limits.max, scale);
        }
      </script>`;

      const { code } = runPlugin(input);

      // A captured worklet CLASS never appears in `closureVariables` under its own name —
      // `buildWorkletString` replaces `Limits` with `Limits<suffix>` and prepends
      // `const Limits = Limits<suffix>();` to the body. So the constructor name is body-scoped
      // exactly like a capture, and reading it from a parameter default is the original defect at
      // a trigger the closure-name scan alone cannot see.
      expect(code).toContain(
        'let limits=_workletParameter===void 0?new Limits():_workletParameter'
      );
    });

    test('a hoisted initializer lands AFTER the class-factory declaration it reads', () => {
      const input = html`<script>
        class Limits {
          constructor() {
            this.max = 8;
          }
        }

        function clamp(scale, limits = new Limits()) {
          'worklet';
          return Math.min(limits.max, scale);
        }
      </script>`;

      const { code } = runPlugin(input);

      // Ordering, not merely presence: `const Limits = …` is a `const`, so an initializer placed
      // above it reads the name in its temporal dead zone and throws just as surely as the
      // unhoisted version did. The closure destructure stays first because the factory call needs
      // it.
      const factoryIndex = code.indexOf('const Limits=');
      const hoistIndex = code.indexOf('let limits=');

      expect(factoryIndex).toBeGreaterThan(-1);
      expect(hoistIndex).toBeGreaterThan(factoryIndex);
    });

    test('the emitted worklet RUNS, and runs its defaults in source order', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };

        function span(
          first = (this.trace.push('first'), DEFAULTS),
          second = this.trace.push('second')
        ) {
          'worklet';
          this.trace.push('body');
          return first.max + second;
        }
      </script>`;

      const { code } = runPlugin(input);

      // Every other test in this block asserts emitted TEXT, which structurally cannot fail for
      // the reason this defect fails: the emitted function parses fine and throws when it is
      // CALLED. So this one calls it, in the only scope that matters — `new Function` compiles in
      // the global scope, so the captured `DEFAULTS` is reachable through `this.__closure` and
      // through nothing else, which is the UI runtime's shape.
      const worklet = evaluateWorkletCode(code);
      const trace: Array<string> = [];

      // The recorder rides on the host object, which is the one channel a bare `new Function`
      // scope has into this one and costs nothing outside the call. A parameter default reads
      // `this` from the call receiver in either arm — the hoisted one and the one this patch
      // would leave in parameter scope — so the counterfactual is still observable.
      const result = worklet.call({ __closure: { DEFAULTS: { max: 8 } }, trace });

      // `Array.prototype.push` returns the new length, so `second` is 2 and the value doubles as
      // proof that the default ran rather than being dropped: 8 + 2.
      expect(result).toBe(10);
      // The ORDER is what the value cannot tell you — leaving `second` in the parameter scope
      // yields the identical 10 while running the two side effects the other way round.
      expect(trace).toEqual(['first', 'second', 'body']);
    });

    test('a body statement calling a `__classFactory` name the plugin did not generate is not a hoist anchor', () => {
      const input = html`<script>
        const DEFAULTS = { max: 8 };
        const gadget__classFactory = () => ({ size: 2 });

        function span(limits = (this.trace.push('default'), DEFAULTS)) {
          'worklet';
          const gadget = gadget__classFactory();
          return limits.max + gadget.size;
        }
      </script>`;

      const { code } = runPlugin(input);
      const worklet = evaluateWorkletCode(code);
      const trace: Array<string> = [];

      // The suffix is a plain string, so a body statement may take the exact shape of a generated
      // factory declaration without the plugin having written it. Counting it puts the hoisted
      // parameter BELOW that statement, and the source runs every parameter expression first.
      const result = worklet.call({
        __closure: {
          DEFAULTS: { max: 8 },
          gadget__classFactory: () => {
            trace.push('gadget');
            return { size: 2 };
          },
        },
        trace,
      });

      expect(result).toBe(10);
      expect(trace).toEqual(['default', 'gadget']);
      expect(code.indexOf('let limits=')).toBeLessThan(
        code.indexOf('const gadget=')
      );
    });

    test('a captured name ending in the class-factory suffix declares no body binding', () => {
      const input = html`<script>
        const gadget__classFactory = () => 2;

        function span(gadget, size = gadget * 2) {
          'worklet';
          return size + gadget__classFactory();
        }
      </script>`;

      const { code } = runPlugin(input);

      // Recovering a constructor name by stripping the suffix off a closure entry invents a
      // body-scoped `gadget` that no declaration creates, and here the real `gadget` is an
      // earlier PARAMETER — which parameter scope can legitimately see. The default would then
      // be hoisted for a reason that does not exist, and a spurious member drags every later
      // parameter with it and can lose the whole plan to the `var`-redeclaration refusal.
      expect(code).not.toContain('_workletParameter');
      expect(code).toContain('size=gadget*2');
    });
  });

  describe('generally', () => {
    test('transforms', () => {
      const input = html`<script>
        import Animated, {
          useAnimatedStyle,
          useSharedValue,
        } from 'react-native-reanimated';

        function Box() {
          const offset = useSharedValue(0);

          const animatedStyles = useAnimatedStyle(() => {
            return {
              transform: [{ translateX: offset.value * 255 }],
            };
          });

          return (
            <>
              <Animated.View style={[styles.box, animatedStyles]} />
              <Button
                onPress={() => (offset.value = Math.random())}
                title="Move"
              />
            </>
          );
        }
      </script>`;

      const { code } = runPlugin(input, {
        plugins: ['@babel/plugin-syntax-jsx'],
      });
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('injects its version', () => {
      process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION = '0';
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain(`__pluginVersion = "${packageVersion}"`);
    });

    test('injects source maps', () => {
      process.env.WORKLETS_JEST_SHOULD_MOCK_SOURCE_MAP = '0';
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const { code } = runPlugin(input);
      // Expect a string that contains (including the backslash): sourceMap: \"{
      expect(code).toMatch(/sourceMap: /gm);
      // this non-mocked source map is hard-coded, feel free to update it accordingly
      expect(code).toContain('AACQ,SAAAA,SAAeA,CAAA,MAAAA,SAAA,O');
    });

    test('strips queries from filename when injecting source maps', () => {
      process.env.WORKLETS_JEST_SHOULD_MOCK_SOURCE_MAP = '0';
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const queries = ['?query', '#hash', '?query#hash'];

      for (const query of queries) {
        const filename = MOCK_LOCATION + query;

        const { code } = runPlugin(input, {}, {}, filename);

        expect(code).toMatch(/sourceMap: /gm);
        expect(code).toContain(filename);
        expect(code).toMatchSnapshot();
      }
    });

    test('uses relative source location when `relativeSourceLocation` is set to `true`', () => {
      process.env.WORKLETS_JEST_SHOULD_MOCK_SOURCE_MAP = '0';
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const { code } = runPlugin(input, undefined, {
        relativeSourceLocation: true,
      });

      const matches = code?.match(new RegExp(`..${MOCK_LOCATION}`, 'g'));
      expect(matches).toHaveLength(2);
    });

    test('removes comments from worklets', () => {
      const input = html`<script>
        const f = () => {
          'worklet';
          // some comment
          /*
           * other comment
           */
          return true;
        };
      </script>`;

      const { code } = runPlugin(input);
      const initDataCode = code!.match(
        /const _worklet_[0-9]+_init_data = {[\s\S]*?};/gm
      );
      for (const initData of initDataCode!) {
        expect(initData).not.toContain('some comment');
        expect(initData).not.toContain('other comment');
      }
    });

    test('supports recursive calls', () => {
      const input = html`<script>
        const a = 1;
        function foo(t) {
          'worklet';
          if (t > 0) {
            return a + foo(t - 1);
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatch(/const foo_null[0-9]+=this._recur;/gm);
      expect(code).toMatchSnapshot();
    });
  });

  describe('for worklet names', () => {
    test('unnamed ArrowFunctionExpression', () => {
      const input = html`<script>
        () => {
          'worklet';
          return 1;
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatch(/function null[0-9]+\(\)/gm);
      expect(code).toMatchSnapshot();
    });

    test('unnamed FunctionExpression', () => {
      const input = html`<script>
        [
          function () {
            'worklet';
            return 1;
          },
        ]();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatch(/function null[0-9]+\(\)/gm);
      expect(code).toMatchSnapshot();
    });

    test('names ObjectMethod with expression key', () => {
      const input = html`<script>
        const obj = {
          ['foo']() {
            'worklet';
          },
        };
      </script>`;

      // TODO: this is an edge case that wasn't ever handled.
      expect(() => runPlugin(input)).toThrow();
      // const { code } = runPlugin(input);
      // expect(code).toMatch(/function foo_null[0-9]+\(\)/gm);
      // expect(code).toMatchSnapshot();
    });

    test('appends file name to function name', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          return 1;
        }
      </script>`;

      const { code } = runPlugin(
        input,
        {},
        { disableSourceMaps: true },
        '/source.js'
      );
      expect(code).toMatch(/function foo_sourceJs[0-9]+\(\)/gm);
      expect(code).toMatchSnapshot();
    });

    test('appends library name to function name', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          return 1;
        }
      </script>`;

      const { code } = runPlugin(
        input,
        {},
        { disableSourceMaps: true },
        '/node_modules/library/source.js'
      );
      expect(code).toMatch(/function foo_library_sourceJs[0-9]+\(\)/gm);
      expect(code).toMatchSnapshot();
    });

    test('handles names with illegal characters', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          return 1;
        }
      </script>`;

      const { code } = runPlugin(
        input,
        {},
        {
          disableSourceMaps: true,
        },
        '/-source.js'
      );
      expect(code).toMatch(/function foo_SourceJs[0-9]+\(\)/gm);
      expect(code).toMatchSnapshot();
    });

    test('preserves recursion', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          foo(1);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatch(/function foo_null[0-9]+\(\)/gm); // React code
      expect(code).toMatchInWorkletString(/function foo_null[0-9]+\(\)/gm); // Worklet code
      expect(code).toMatchSnapshot();
    });
  });

  describe('for DirectiveLiterals', () => {
    test("doesn't bother other Directive Literals", () => {
      const input = html`<script>
        function foo() {
          'foobar';
          var foo = 'bar';
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('foobar');
      expect(code).toMatchSnapshot();
    });

    test("doesn't transform functions without 'worklet' directive", () => {
      const input = html`<script>
        function f(x) {
          return x + 2;
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test("removes 'worklet'; directive from worklets", () => {
      const input = html`<script>
        function foo(x) {
          'worklet'; // prettier-ignore
          return x + 2;
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    test("doesn't transform string literals", () => {
      const input = html`<script>
        function foo(x) {
          'worklet';
          const bar = 'worklet'; // prettier-ignore
          const baz = "worklet"; // prettier-ignore
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain("bar = 'worklet';");
      expect(code).toContain('baz = "worklet";');
      expect(code).toMatchSnapshot();
    });
  });

  describe('for closure capturing', () => {
    test('captures worklets environment', () => {
      const input = html`<script>
        const x = 5;

        const objX = { x };

        function f() {
          'worklet';
          return { res: x + objX.x };
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toContain('_f.__closure = {};');
      expect(code).toMatchSnapshot();
    });

    test('implicitly captures globals with strictGlobal disabled', () => {
      const input = html`<script>
        function f() {
          'worklet';
          globalStuff();
        }
      </script>`;
      const { code, ast } = runPlugin(
        input,
        { ast: true },
        { strictGlobal: false }
      );
      let closureBindings;
      traverse(ast!, {
        enter(path) {
          if (
            path.isAssignmentExpression() &&
            'property' in path.node.left &&
            'name' in path.node.left.property &&
            'properties' in path.node.right &&
            path.node.left.property.name === '__closure'
          ) {
            closureBindings = path.node.right.properties;
          }
        },
      });
      expect(closureBindings).not.toEqual([]);
      expect(code).toMatch(/f\.__closure = {\s*globalStuff/gm);
      expect(code).toMatchSnapshot();
    });

    test("doesn't implicitly captures globals in strict mode", () => {
      const input = html`<script>
        function f() {
          'worklet';
          globalStuff();
        }
      </script>`;
      const { code, ast } = runPlugin(
        input,
        { ast: true },
        { strictGlobal: true }
      );
      let closureBindings;
      traverse(ast!, {
        enter(path) {
          if (
            path.isAssignmentExpression() &&
            'property' in path.node.left &&
            'name' in path.node.left.property &&
            'properties' in path.node.right &&
            path.node.left.property.name === '__closure'
          ) {
            closureBindings = path.node.right.properties;
          }
        },
      });
      expect(closureBindings).toEqual([]);
      expect(code).toMatchSnapshot();
    });

    test("doesn't capture custom globals", () => {
      const input = html`<script>
        function f() {
          'worklet';
          console.log(foo);
        }
      </script>`;

      const { code } = runPlugin(input, undefined, { globals: ['foo'] });
      expect(code).toContain('f.__closure = {}');
      expect(code).toMatchSnapshot();
    });

    test("doesn't capture locally bound variables named like custom globals", () => {
      const input = html`<script>
        const foo = 42;

        function f() {
          'worklet';
          console.log(foo);
        }
      </script>`;

      const { code } = runPlugin(input, undefined, { globals: ['foo'] });
      expect(code).toMatch(/f\.__closure = {\s*foo/gm);
      expect(code).toMatchSnapshot();
    });

    test("doesn't capture arguments", () => {
      const input = html`<script>
        function f(a, b, c) {
          'worklet';
          console.log(arguments);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('f.__closure = {}');
      expect(code).toMatchSnapshot();
    });

    test("doesn't capture objects' properties", () => {
      const input = html`<script>
        const foo = { bar: 42 };

        function f() {
          'worklet';
          console.log(foo.bar);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatch(/f\.__closure = {\s*foo/gm);
      expect(code).toMatchSnapshot();
    });
  });

  describe('for class worklets', () => {
    test('workletizes instance method', () => {
      const input = html`<script>
        class Foo {
          bar(x) {
            'worklet';
            return x + 2;
          }
        }
      </script>`;

      const { code } = runPlugin(input, {
        configFile: './plugin-unit-test.babel.config.js',
      });
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    test('workletizes static method', () => {
      const input = html`<script>
        class Foo {
          static bar(x) {
            'worklet';
            return x + 2;
          }
        }
      </script>`;

      const { code } = runPlugin(input, {
        configFile: './plugin-unit-test.babel.config.js',
      });
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    test('leaves getter untouched', () => {
      const input = html`<script>
        const x = 5;
        class Foo {
          get bar() {
            'worklet';
            return x + 2;
          }
        }
      </script>`;

      const { code } = runPlugin(input, {
        configFile: './plugin-unit-test.babel.config.js',
      });
      expect(code).not.toHaveWorkletData();
      expect(code).toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    test('leaves setter untouched', () => {
      const input = html`<script>
        class Foo {
          set bar(x) {
            'worklet';
            this.x = x + 2;
          }
        }
      </script>`;

      const { code } = runPlugin(input, {
        configFile: './plugin-unit-test.babel.config.js',
      });
      expect(code).not.toHaveWorkletData();
      expect(code).toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    test('workletizes class field', () => {
      const input = html`<script>
        class Foo {
          bar = (x) => {
            'worklet';
            return x + 2;
          };
        }
      </script>`;

      const { code } = runPlugin(input, {
        configFile: './plugin-unit-test.babel.config.js',
      });
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    test('workletizes static class field', () => {
      const input = html`<script>
        class Foo {
          static bar = (x) => {
            'worklet';
            return x + 2;
          };
        }
      </script>`;

      const { code } = runPlugin(input, {
        configFile: './plugin-unit-test.babel.config.js',
      });
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    test('leaves constructor untouched', () => {
      const input = html`<script>
        class Foo {
          constructor(x) {
            'worklet';
            this.x = x;
          }
        }
      </script>`;

      const { code } = runPlugin(input, {
        configFile: './plugin-unit-test.babel.config.js',
      });
      expect(code).not.toHaveWorkletData();
      expect(code).toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });
  });

  describe('for function hooks', () => {
    test('workletizes hook wrapped unnamed FunctionExpression automatically', () => {
      const input = html`<script>
        const animatedStyle = useAnimatedStyle(function () {
          return {
            width: 50,
          };
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('workletizes hook wrapped named FunctionExpression automatically', () => {
      const input = html`<script>
        const animatedStyle = useAnimatedStyle(function foo() {
          return {
            width: 50,
          };
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('workletizes hook wrapped worklet reference automatically', () => {
      const input = html`<script>
        const style = () => {
          return {
            color: 'red',
            backgroundColor: 'blue',
          };
        };
        const animatedStyle = useAnimatedStyle(style);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });
  });

  describe('for object hooks', () => {
    test('workletizes useAnimatedScrollHandler wrapped ArrowFunctionExpression automatically', () => {
      const input = html`<script>
        useAnimatedScrollHandler({
          onScroll: (event) => {
            console.log(event);
          },
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('workletizes useAnimatedScrollHandler wrapped unnamed FunctionExpression automatically', () => {
      const input = html`<script>
        useAnimatedScrollHandler({
          onScroll: function (event) {
            console.log(event);
          },
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('workletizes useAnimatedScrollHandler wrapped named FunctionExpression automatically', () => {
      const input = html`<script>
        useAnimatedScrollHandler({
          onScroll: function onScroll(event) {
            console.log(event);
          },
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('workletizes useAnimatedScrollHandler wrapped ObjectMethod automatically', () => {
      const input = html`<script>
        useAnimatedScrollHandler({
          onScroll(event) {
            console.log(event);
          },
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('supports empty object in useAnimatedScrollHandler', () => {
      const input = html`<script>
        useAnimatedScrollHandler({});
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('transforms each object property in useAnimatedScrollHandler', () => {
      const input = html`<script>
        useAnimatedScrollHandler({
          onScroll: () => {},
          onBeginDrag: () => {},
          onEndDrag: () => {},
          onMomentumBegin: () => {},
          onMomentumEnd: () => {},
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(5);
      expect(code).toMatchSnapshot();
    });

    test('transforms ArrowFunctionExpression as argument of useAnimatedScrollHandler', () => {
      const input = html`<script>
        useAnimatedScrollHandler((event) => {
          console.log(event);
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('transforms unnamed FunctionExpression as argument of useAnimatedScrollHandler', () => {
      const input = html`<script>
        useAnimatedScrollHandler(function (event) {
          console.log(event);
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('transforms named FunctionExpression as argument of useAnimatedScrollHandler', () => {
      const input = html`<script>
        useAnimatedScrollHandler(function foo(event) {
          console.log(event);
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });
  });

  describe('for react-native-gesture-handler', () => {
    test('workletizes gesture callbacks using the hooks api', () => {
      const input = html`<script>
        const foo = useTapGesture({
          numberOfTaps: 2,
          onBegin: () => {
            console.log('onBegin');
          },
          onStart: (_event) => {
            console.log('onStart');
          },
          onEnd: (_event, _success) => {
            console.log('onEnd');
          },
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(3);
      expect(code).toMatchSnapshot();
    });

    test('workletizes referenced gesture callbacks using the hooks api', () => {
      const input = html`<script>
        const onBegin = () => {
          console.log('onBegin');
        };
        const foo = useTapGesture({
          numberOfTaps: 2,
          onBegin: onBegin,
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes referenced gesture callbacks using the hooks api and shorthand syntax', () => {
      const input = html`<script>
        const onBegin = () => {
          console.log('onBegin');
        };
        const foo = useTapGesture({
          numberOfTaps: 2,
          onBegin,
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes possibly chained gesture object callback functions automatically', () => {
      const input = html`<script>
        const foo = Gesture.Tap()
          .numberOfTaps(2)
          .onBegin(() => {
            console.log('onBegin');
          })
          .onStart((_event) => {
            console.log('onStart');
          })
          .onEnd((_event, _success) => {
            console.log('onEnd');
          });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(3);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize irrelevant chained gesture object callback functions", () => {
      const input = html`<script>
        const foo = Gesture.Tap().toString();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test("doesn't transform standard callback functions", () => {
      const input = html`<script>
        const foo = Something.Tap().onEnd((_event, _success) => {
          console.log('onEnd');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test("doesn't transform chained methods of objects containing Gesture property", () => {
      const input = html`<script>
        const foo = Something.Gesture.Tap().onEnd(() => {
          console.log('onEnd');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('transforms spread operator in worklets for arrays', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          const bar = [4, 5];
          const baz = [1, ...[2, 3], ...bar];
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('...[2,3]');
      expect(code).toContain('...bar');
      expect(code).toMatchSnapshot();
    });

    test('transforms spread operator in worklets for objects', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          const bar = { d: 4, e: 5 };
          const baz = { a: 1, ...{ b: 2, c: 3 }, ...bar };
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('...{b:2,c:3}');
      expect(code).toContain('...bar');
      expect(code).toMatchSnapshot();
    });

    test('transforms spread operator in worklets for function arguments', () => {
      const input = html`<script>
        function foo(...args) {
          'worklet';
          console.log(args);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('...args');
      expect(code).toMatchSnapshot();
    });

    test('transforms spread operator in worklets for function calls', () => {
      const input = html`<script>
        function foo(arg) {
          'worklet';
          console.log(...arg);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('...arg');
      expect(code).toMatchSnapshot();
    });

    test('transforms spread operator in Animated component', () => {
      const input = html`<script>
        function App() {
          return (
            <Animated.View
              style={[style, { ...styles.container, width: sharedValue.value }]}
            />
          );
        }
      </script>`;

      const { code } = runPlugin(input, {
        plugins: ['@babel/plugin-syntax-jsx'],
      });
      expect(code).toMatchSnapshot();
    });

    test('workletizes referenced callbacks', () => {
      const input = html`<script>
        const onStart = () => {};
        const foo = Gesture.Tap().onStart(onStart);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });
  });

  describe('for sequence expressions', () => {
    test('supports SequenceExpression', () => {
      const input = html`<script>
        function App() {
          (0, fun)({ onStart() {} }, []);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatchSnapshot();
    });

    test('supports SequenceExpression, with objectHook', () => {
      const input = html`<script>
        function App() {
          (0, useAnimatedScrollHandler)({ onScroll() {} }, []);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('supports SequenceExpression, with worklet', () => {
      const input = html`<script>
        function App() {
          (0, fun)(
            {
              onStart() {
                'worklet';
              },
            },
            []
          );
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    test('supports SequenceExpression, many arguments', () => {
      const input = html`<script>
        function App() {
          (0, 3, fun)(
            {
              onStart() {
                'worklet';
              },
            },
            []
          );
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    test('supports SequenceExpression, with worklet closure', () => {
      const input = html`<script>
        function App() {
          const obj = { a: 1, b: 2 };
          (0, fun)(
            {
              onStart() {
                'worklet';
                const a = obj.a;
              },
            },
            []
          );
        }
      </script>`;

      const { code, ast } = runPlugin(input, { ast: true });
      let closureBindings;
      traverse(ast!, {
        enter(path) {
          if (
            path.isAssignmentExpression() &&
            'property' in path.node.left &&
            'name' in path.node.left.property &&
            'properties' in path.node.right &&
            path.node.left.property.name === '__closure'
          ) {
            closureBindings = path.node.right.properties;
          }
        },
      });
      expect(closureBindings).toHaveLength(1);
      expect(code).toMatchSnapshot();
    });
  });

  describe('for inline styles', () => {
    test('shows a warning if user uses .value inside inline style', () => {
      const input = html`<script>
        function App() {
          return <Animated.View style={{ width: sharedValue.value }} />;
        }
      </script>`;

      const { code } = runPlugin(input, {
        plugins: ['@babel/plugin-syntax-jsx'],
      });
      expect(code).toHaveInlineStyleWarning();
      expect(code).toMatchSnapshot();
    });

    test("doesn't show a warning if the user uses ['value'] inside inline style", () => {
      const input = html`<script>
        function App() {
          return <Animated.View style={{ width: object['value'] }} />;
        }
      </script>`;

      const { code } = runPlugin(input, {
        plugins: ['@babel/plugin-syntax-jsx'],
      });
      expect(code).not.toHaveInlineStyleWarning();
      expect(code).toMatchSnapshot();
    });

    test("doesn't show a warning if the user uses [value] inside inline style", () => {
      const input = html`<script>
        function App() {
          return <Animated.View style={{ width: object[value] }} />;
        }
      </script>`;

      const { code } = runPlugin(input, {
        plugins: ['@babel/plugin-syntax-jsx'],
      });
      expect(code).not.toHaveInlineStyleWarning();
      expect(code).toMatchSnapshot();
    });

    test('shows a warning if user uses .value inside inline style, style array', () => {
      const input = html`<script>
        function App() {
          return (
            <Animated.View style={[style, { width: sharedValue.value }]} />
          );
        }
      </script>`;

      const { code } = runPlugin(input, {
        plugins: ['@babel/plugin-syntax-jsx'],
      });
      expect(code).toHaveInlineStyleWarning();
      expect(code).toMatchSnapshot();
    });

    test('shows a warning if user uses .value inside inline style, transforms', () => {
      const input = html`<script>
        function App() {
          return (
            <Animated.View
              style={{ transform: [{ translateX: sharedValue.value }] }}
            />
          );
        }
      </script>`;

      const { code } = runPlugin(input, {
        plugins: ['@babel/plugin-syntax-jsx'],
      });
      expect(code).toHaveInlineStyleWarning();
      expect(code).toMatchSnapshot();
    });

    test("doesn't show a warning if user writes something like style={styles.value}", () => {
      const input = html`<script>
        function App() {
          return <Animated.View style={styles.value} />;
        }
      </script>`;

      const { code } = runPlugin(input, {
        plugins: ['@babel/plugin-syntax-jsx'],
      });
      expect(code).not.toHaveInlineStyleWarning();
      expect(code).toMatchSnapshot();
    });
  });

  describe('is idempotent', () => {
    test('for common cases', () => {
      function resultIsIdempotent(input: string) {
        const firstResult = runPlugin(input).code;
        assert(firstResult);
        const secondResult = runPlugin(firstResult).code;
        return firstResult === secondResult;
      }

      const input1 = html`<script>
        const foo = useAnimatedStyle(() => {
          const x = 1;
        });
      </script>`;
      expect(resultIsIdempotent(input1)).toBe(true);

      const input2 = html`<script>
        const foo = useAnimatedStyle(() => {
          const bar = useAnimatedStyle(() => {
            const x = 1;
          });
        });
      </script>`;
      expect(resultIsIdempotent(input2)).toBe(true);

      const input3 = html`<script>
        const foo = useAnimatedStyle(function named() {
          const bar = useAnimatedStyle(function named() {
            const x = 1;
          });
        });
      </script>`;
      expect(resultIsIdempotent(input3)).toBe(true);

      const input4 = html`<script>
        const foo = (x) => {
          return () => {
            'worklet';
            return x;
          };
        };
      </script>`;
      expect(resultIsIdempotent(input4)).toBe(true);

      const input5 = html`<script>
        const foo = useAnimatedStyle({
          method() {
            'worklet';
            const x = 1;
          },
        });
      </script>`;
      expect(resultIsIdempotent(input5)).toBe(true);

      const input6 = html`<script>
        const foo = () => {
          'worklet';
          return useAnimatedStyle(() => {
            return () => {
              'worklet';
              return 1;
            };
          });
        };
      </script>`;
      expect(resultIsIdempotent(input6)).toBe(true);

      const input7 = html`<script>
        const scrollHandler = useAnimatedScrollHandler({
          onScroll: () => {
            return useAnimatedStyle(() => {
              return 1;
            });
          },
        });
      </script>`;
      expect(resultIsIdempotent(input7)).toBe(true);

      const input8 = html`<script>
        const scrollHandler = useAnimatedScrollHandler({
          onScroll: () => {
            return useAnimatedScrollHandler({
              onScroll: () => {
                return 1;
              },
            });
          },
        });
      </script>`;
      expect(resultIsIdempotent(input8)).toBe(true);

      const input9 = html`<script>
        Gesture.Pan.onStart(
          useAnimatedStyle(() => {
            return () => {
              'worklet';
              Gesture.Pan.onStart(() => {
                'worklet';
                return 1;
              });
            };
          })
        );
      </script>`;
      expect(resultIsIdempotent(input9)).toBe(true);
    });
  });

  describe('for Layout Animations', () => {
    test('workletizes unchained callback functions automatically', () => {
      const input = html`<script>
        FadeIn.withCallback(() => {
          console.log('FadeIn');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes unchained callback functions automatically with new keyword', () => {
      const input = html`<script>
        new FadeIn().withCallback(() => {
          console.log('FadeIn');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects", () => {
      const input = html`<script>
        AmogusIn.withCallback(() => {
          console.log('AmogusIn');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects with new keyword", () => {
      const input = html`<script>
        new AmogusIn().withCallback(() => {
          console.log('AmogusIn');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    test('workletizes callback functions on known chained methods before', () => {
      const input = html`<script>
        FadeIn.build().withCallback(() => {
          console.log('FadeIn with build before');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes callback functions on known chained methods before with new keyword', () => {
      const input = html`<script>
        new FadeIn().build().withCallback(() => {
          console.log('FadeIn with build before');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects on known chained methods before", () => {
      const input = html`<script>
        AmogusIn.build().withCallback(() => {
          console.log('AmogusIn with build before');
        });
      </script>`;
      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects on known chained methods before with new keyword", () => {
      const input = html`<script>
        new AmogusIn().build().withCallback(() => {
          console.log('AmogusIn with build before');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    test('workletizes callback functions on known chained methods after', () => {
      const input = html`<script>
        FadeIn.withCallback(() => {
          console.log('FadeIn with build after');
        }).build();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes callback functions on known chained methods after with new keyword', () => {
      const input = html`<script>
        new FadeIn()
          .withCallback(() => {
            console.log('FadeIn with build after');
          })
          .build();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown chained methods before", () => {
      const input = html`<script>
        FadeIn.AmogusIn().withCallback(() => {
          console.log('FadeIn with AmogusIn before');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown chained methods before with new keyword", () => {
      const input = html`<script>
        new FadeIn().AmogusIn().withCallback(() => {
          console.log('FadeIn with AmogusIn before');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects chained with known objects", () => {
      const input = html`<script>
        AmogusIn.FadeIn().withCallback(() => {
          console.log('AmogusIn with FadeIn after');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects chained with known objects with new keyword", () => {
      const input = html`<script>
        new AmogusIn().FadeIn().withCallback(() => {
          console.log('AmogusIn with FadeIn after');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    test('workletizes callback functions on unknown objects chained after', () => {
      const input = html`<script>
        FadeIn.withCallback(() => {
          console.log('FadeIn with AmogusIn after');
        }).AmogusIn();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes callback functions on unknown objects chained after with new keyword', () => {
      const input = html`<script>
        new FadeIn()
          .withCallback(() => {
            console.log('FadeIn with AmogusIn after');
          })
          .AmogusIn();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects with known object chained after", () => {
      const input = html`<script>
        AmogusIn.withCallback(() => {
          console.log('AmogusIn with FadeIn before');
        }).FadeIn();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize callback functions on unknown objects with known object chained after with new keyword", () => {
      const input = html`<script>
        new AmogusIn()
          .withCallback(() => {
            console.log('AmogusIn with FadeIn before');
          })
          .FadeIn();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    test('workletizes callback functions on longer chains of known objects', () => {
      const input = html`<script>
        FadeIn.build()
          .duration()
          .withCallback(() => {
            console.log('FadeIn with build');
          });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes callback functions on longer chains of known objects with new keyword', () => {
      const input = html`<script>
        new FadeIn()
          .build()
          .duration()
          .withCallback(() => {
            console.log('FadeIn with build');
          });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });
  });

  describe('for debugging', () => {
    test('does inject location for worklets in dev builds', () => {
      const input = html`<script>
        const foo = useAnimatedStyle(() => {
          const x = 1;
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveLocation(MOCK_LOCATION);
      expect(code).toMatchSnapshot();
    });

    test("doesn't inject location for worklets in production builds", () => {
      const input = html`<script>
        const foo = useAnimatedStyle(() => {
          const x = 1;
        });
      </script>`;

      const current = process.env.BABEL_ENV;
      process.env.BABEL_ENV = 'production';
      const { code } = runPlugin(input);
      process.env.BABEL_ENV = current;
      expect(code).not.toHaveLocation(MOCK_LOCATION);
      expect(code).toMatchSnapshot();
    });

    test("doesn't inject version for worklets in production builds", () => {
      const input = html`<script>
        const foo = useAnimatedStyle(() => {
          const x = 1;
        });
      </script>`;

      const current = process.env.BABEL_ENV;
      process.env.BABEL_ENV = 'production';
      const { code } = runPlugin(input);
      process.env.BABEL_ENV = current;
      expect(code).not.toContain('version: ');
      expect(code).toMatchSnapshot();
    });

    test('throws a tagged exception when worklet processing fails', () => {
      const input = html`<script>
        const foo = useAnimatedStyle(() => {
          return <Image />;
        });
      </script>`;

      expect(() =>
        runPlugin(input, { plugins: ['@babel/plugin-syntax-jsx'] })
      ).toThrow('[Worklets]');
    });
  });

  describe('for worklet nesting', () => {
    test('transpiles nested worklets', () => {
      const input = html`<script>
        const foo = () => {
          'worklet';
          const bar = () => {
            'worklet';
            console.log('bar');
          };
          bar();
        };
      </script>`;

      const { code } = runPlugin(input, {});
      expect(code).toHaveWorkletData(2);
      expect(code).toMatchSnapshot();
    });

    test('transpiles nested worklets with depth 3', () => {
      const input = html`<script>
        const foo = () => {
          'worklet';
          const bar = () => {
            'worklet';
            const foobar = () => {
              'worklet';
              console.log('foobar');
            };
          };
          bar();
        };
      </script>`;

      const { code } = runPlugin(input, {});

      expect(code).toHaveWorkletData(3);
      expect(code).toMatchSnapshot();
    });

    test('transpiles nested worklets embedded in runOnJS in runOnUI', () => {
      const input = html`<script>
        runOnUI(() => {
          console.log('Hello from UI thread');
          runOnJS(() => {
            'worklet';
            console.log('Hello from JS thread');
          })();
        })();
      </script>`;
      const { code } = runPlugin(input, {});

      expect(code).toHaveWorkletData(2);
      expect(code).toMatchSnapshot();
    });

    test('transpiles nested worklets embedded in runOnUI in runOnJS in runOnUI', () => {
      const input = html`<script>
        runOnUI(() => {
          console.log('Hello from UI thread');
          runOnJS(() => {
            'worklet';
            console.log('Hello from JS thread');
            runOnUI(() => {
              console.log('Hello from UI thread again');
            })();
          })();
        })();
      </script>`;
      const { code } = runPlugin(input, {});

      expect(code).toHaveWorkletData(3);
      expect(code).toMatchSnapshot();
    });

    test('transpiles worklets with functions defined on UI thread to run them on JS', () => {
      const input = html`<script>
        runOnUI(() => {
          const a = () => {
            'worklet';
            console.log('Good morning from JS thread!');
          };
          const b = () => {
            'worklet';
            console.log('Good afternoon from JS thread');
          };
          const func = Math.random() < 0.5 ? a : b;
          runOnJS(func)();
        })();
      </script>`;
      const { code } = runPlugin(input, {});

      expect(code).toHaveWorkletData(3);
      expect(code).toMatchSnapshot();
    });
  });

  describe('for web configuration', () => {
    test('skips initData when omitNativeOnlyData option is set to true', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const { code } = runPlugin(input, {}, { omitNativeOnlyData: true });
      expect(code).toHaveInitData(0);
      expect(code).toMatchSnapshot();
    });

    test('includes initData when omitNativeOnlyData option is set to false', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var bar = 'bar';
        }
      </script>`;

      const { code } = runPlugin(input, {}, { omitNativeOnlyData: false });
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('substitutes isWeb and shouldBeUseWeb with true when substituteWebPlatformChecks option is set to true', () => {
      const input = html`<script>
        const x = isWeb();
        const y = shouldBeUseWeb();
      </script>`;

      const { code } = runPlugin(
        input,
        {},
        { substituteWebPlatformChecks: true }
      );
      expect(code).toContain('const x = true;');
      expect(code).toContain('const y = true;');
      expect(code).toMatchSnapshot();
    });

    test("doesn't substitute isWeb and shouldBeUseWeb with true when substituteWebPlatformChecks option is set to false", () => {
      const input = html`<script>
        const x = isWeb();
        const y = shouldBeUseWeb();
      </script>`;

      const { code } = runPlugin(
        input,
        {},
        { substituteWebPlatformChecks: false }
      );
      expect(code).toContain('const x = isWeb();');
      expect(code).toContain('const y = shouldBeUseWeb();');
      expect(code).toMatchSnapshot();
    });

    test("doesn't substitute isWeb and shouldBeUseWeb with true when substituteWebPlatformChecks option is undefined", () => {
      const input = html`<script>
        const x = isWeb();
        const y = shouldBeUseWeb();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('const x = isWeb();');
      expect(code).toContain('const y = shouldBeUseWeb();');
      expect(code).toMatchSnapshot();
    });

    test("doesn't substitute isWeb and shouldBeUseWeb in worklets", () => {
      const input = html`<script>
        function foo() {
          'worklet';
          const x = isWeb();
          const y = shouldBeUseWeb();
        }
      </script>`;

      const { code } = runPlugin(
        input,
        {},
        { substituteWebPlatformChecks: true }
      );
      expect(code).toContain('const x=isWeb();');
      expect(code).toContain('const y=shouldBeUseWeb();');
      expect(code).toMatchSnapshot();
    });
  });

  describe('for generators', () => {
    test('makes a generator worklet factory', () => {
      const input = html`<script>
        function* foo() {
          'worklet';
          yield 'hello';
          yield 'world';
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('const foo = function* () {');
      expect(code).toMatchSnapshot();
    });

    test('makes a generator worklet string', () => {
      const input = html`<script>
        function* foo() {
          'worklet';
          yield 'hello';
          yield 'world';
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatch(
        /code: "\(function\*foo_null[0-9]+\(\){yield'hello';yield'world';}\)"/gm
      );
      expect(code).toMatchSnapshot();
    });
  });

  describe('for async functions', () => {
    test('makes an async worklet factory', () => {
      const input = html`<script>
        async function foo() {
          'worklet';
          await Promise.resolve();
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('const foo = async function () {');
      expect(code).toMatchSnapshot();
    });

    test('makes an async worklet string', () => {
      const input = html`<script>
        async function foo() {
          'worklet';
          await Promise.resolve();
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatch(
        /code: "\(async function foo_null[0-9]+\(\){await Promise.resolve\(\);}\)"/gm
      );
      expect(code).toMatchSnapshot();
    });
  });

  describe('for referenced worklets', () => {
    test('workletizes ArrowFunctionExpression on its VariableDeclarator', () => {
      const input = html`<script>
        let styleFactory = () => ({});
        const animatedStyle = useAnimatedStyle(styleFactory);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes ArrowFunctionExpression on its AssignmentExpression', () => {
      const input = html`<script>
        let styleFactory;
        styleFactory = () => ({});
        animatedStyle = useAnimatedStyle(styleFactory);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes ArrowFunctionExpression only on last AssignmentExpression', () => {
      const input = html`<script>
        let styleFactory;
        styleFactory = () => 1;
        styleFactory = () => 'AssignmentExpression';
        animatedStyle = useAnimatedStyle(styleFactory);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toContainInWorkletString('AssignmentExpression');
      expect(code).toMatchSnapshot();
    });

    test('workletizes FunctionExpression on its VariableDeclarator', () => {
      const input = html`<script>
        let styleFactory = function () {
          return {};
        };
        const animatedStyle = useAnimatedStyle(styleFactory);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes FunctionExpression on its AssignmentExpression', () => {
      const input = html`<script>
        let styleFactory;
        styleFactory = function () {
          return {};
        };
        animatedStyle = useAnimatedStyle(styleFactory);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes FunctionExpression only on last AssignmentExpression', () => {
      const input = html`<script>
        let styleFactory;
        styleFactory = function () {
          return 1;
        };
        styleFactory = function () {
          return 'AssignmentExpression';
        };
        animatedStyle = useAnimatedStyle(styleFactory);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toContainInWorkletString('AssignmentExpression');
      expect(code).toMatchSnapshot();
    });

    test('workletizes FunctionDeclaration', () => {
      const input = html`<script>
        function styleFactory() {
          return {};
        }
        const animatedStyle = useAnimatedStyle(styleFactory);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes ObjectExpression on its VariableDeclarator', () => {
      const input = html`<script>
        let handler = {
          onScroll: () => {},
        };
        const scrollHandler = useAnimatedScrollHandler(handler);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes ObjectExpression on its AssignmentExpression', () => {
      const input = html`<script>
        let handler;
        handler = {
          onScroll: () => {},
        };
        const scrollHandler = useAnimatedScrollHandler(handler);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes ObjectExpression only on last AssignmentExpression', () => {
      const input = html`<script>
        let handler;
        handler = {
          onScroll: () => 1,
        };
        handler = {
          onScroll: () => 'AssignmentExpression',
        };
        const scrollHandler = useAnimatedScrollHandler(handler);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toContainInWorkletString('AssignmentExpression');
      expect(code).toMatchSnapshot();
    });

    test('prefers FunctionDeclaration over AssignmentExpression', () => {
      const input = html`<script>
        function styleFactory() {
          return 'FunctionDeclaration';
        }
        styleFactory = () => 'AssignmentExpression';
        animatedStyle = useAnimatedStyle(styleFactory);
      </script>`;
      const { code } = runPlugin(input);

      expect(code).toHaveWorkletData(1);
      expect(code).toContainInWorkletString('FunctionDeclaration');
      expect(code).toMatchSnapshot();
    });

    test('prefers AssignmentExpression over VariableDeclarator', () => {
      // This is an anti-pattern, but let's at least have a defined behavior here.
      const input = html`<script>
        let styleFactory = () => 1;
        styleFactory = () => 'AssignmentExpression';
        animatedStyle = useAnimatedStyle(styleFactory);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toContainInWorkletString('AssignmentExpression');
      expect(code).toMatchSnapshot();
    });

    test('workletizes in immediate scope', () => {
      const input = html`<script>
        let styleFactory = () => ({});
        animatedStyle = useAnimatedStyle(styleFactory);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes in nested scope', () => {
      const input = html`<script>
        function outerScope() {
          let styleFactory = () => ({});
          function innerScope() {
            animatedStyle = useAnimatedStyle(styleFactory);
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes assignments that appear after the worklet is used', () => {
      const input = html`<script>
        let styleFactory = () => ({});
        animatedStyle = useAnimatedStyle(styleFactory);
        styleFactory = () => {
          return 'AssignmentAfterUse';
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toContainInWorkletString('AssignmentAfterUse');
      expect(code).toMatchSnapshot();
    });

    test('workletizes multiple referencing', () => {
      const input = html`<script>
        const secondReference = () => ({});
        const firstReference = secondReference;
        const animatedStyle = useAnimatedStyle(firstReference);
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    test('workletizes recursion', () => {
      const input = html`<script>
        function recursiveWorklet() {
          if (!globalThis._WORKLET) {
            runOnUI(recursiveWorklet)();
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });
  });

  describe('for file workletization', () => {
    test('workletizes FunctionDeclaration', () => {
      const input = html`<script>
        'worklet';
        function foo() {
          return 'bar';
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('workletizes assigned FunctionDeclaration', () => {
      const input = html`<script>
        'worklet';
        const foo = function foo() {
          return 'bar';
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('workletizes FunctionDeclaration in named export', () => {
      const input = html`<script>
        'worklet';
        export function foo() {
          return 'bar';
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toContain('export const foo = function foo_null1Factory({');
      expect(code).toMatchSnapshot();
    });

    test('workletizes FunctionDeclaration in default export', () => {
      const input = html`<script>
        'worklet';
        export default function foo() {
          return 'bar';
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toContain('export default (function foo_null1Factory({');
      expect(code).toMatchSnapshot();
    });

    test('workletizes FunctionExpression', () => {
      const input = html`<script>
        'worklet';
        const foo = function () {
          return 'bar';
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('workletizes FunctionExpression in named export', () => {
      const input = html`<script>
        'worklet';
        export const foo = function () {
          return 'bar';
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toContain('export const foo = function null1Factory({');
      expect(code).toMatchSnapshot();
    });

    test('workletizes FunctionExpression in default export', () => {
      const input = html`<script>
        'worklet';
        export default function () {
          return 'bar';
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toContain('export default (function null1Factory({');
      expect(code).toMatchSnapshot();
    });

    test('workletizes ArrowFunctionExpression', () => {
      const input = html`<script>
        'worklet';
        const foo = () => {
          return 'bar';
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('workletizes ArrowFunctionExpression in named export', () => {
      const input = html`<script>
        'worklet';
        export const foo = () => {
          return 'bar';
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toContain('export const foo = function null1Factory({');
      expect(code).toMatchSnapshot();
    });

    test('workletizes ArrowFunctionExpression in default export', () => {
      const input = html`<script>
        'worklet';
        export default () => {
          return 'bar';
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toContain('export default (function null1Factory({');
      expect(code).toMatchSnapshot();
    });

    test('workletizes ObjectMethod', () => {
      const input = html`<script>
        'worklet';
        const foo = {
          bar() {
            return 'bar';
          },
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('workletizes ObjectMethod in named export', () => {
      const input = html`<script>
        'worklet';
        export const foo = {
          bar() {
            return 'bar';
          },
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toContain('export const foo = {');
      expect(code).toMatchSnapshot();
    });

    test('workletizes ObjectMethod in default export', () => {
      const input = html`<script>
        'worklet';
        export default {
          bar() {
            return 'bar';
          },
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toContain('export default {');
      expect(code).toMatchSnapshot();
    });

    test('workletizes ClassDeclaration', () => {
      const input = html`<script>
        'worklet';
        class Clazz {
          foo() {
            return 'bar';
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain(
        'const Clazz__classFactory = function Clazz__classFactory_null6Factory'
      );
      expect(code).toContainInWorkletString('Clazz__classFactory');
      expect(code).toContain('Clazz.Clazz__classFactory = Clazz__classFactory');
      expect(code).toMatchSnapshot();
    });

    test('workletizes ClassDeclaration in named export', () => {
      const input = html`<script>
        'worklet';
        export class Clazz {
          foo() {
            return 'bar';
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('export const Clazz = function () {');
      expect(code).toContain(
        'const Clazz__classFactory = function Clazz__classFactory_null6Factory'
      );
      expect(code).toContainInWorkletString('Clazz__classFactory');
      expect(code).toContain('Clazz.Clazz__classFactory = Clazz__classFactory');
      expect(code).toMatchSnapshot();
    });

    test('workletizes ClassDeclaration in default export', () => {
      const input = html`<script>
        'worklet';
        export default class Clazz {
          foo() {
            return 'bar';
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('export default (function () {');
      expect(code).toContain(
        'const Clazz__classFactory = function Clazz__classFactory_null6Factory'
      );
      expect(code).toContainInWorkletString('Clazz__classFactory');
      expect(code).toContain('Clazz.Clazz__classFactory = Clazz__classFactory');
      expect(code).toMatchSnapshot();
    });

    test('workletizes multiple functions', () => {
      const input = html`<script>
        'worklet';
        function foo() {
          return 'bar';
        }
        const bar = () => {
          return 'foobar';
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(2);
      expect(code).toMatchSnapshot();
    });

    test("doesn't workletize function outside of top level scope", () => {
      const input = html`<script>
        'worklet';
        {
          function foo() {
            return 'bar';
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    test('moves CommonJS export to the bottom of the file', () => {
      const input = html`<script>
        'worklet';
        exports.foo = foo;
        function foo() {}
        const bar = 1;
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('const bar = 1;\nexports.foo = foo;');
      expect(code).toMatchSnapshot();
    });

    test('moves `module.exports` assignment to the bottom of the file', () => {
      const input = html`<script>
        'worklet';
        module.exports = foo;
        function foo() {}
        const bar = 1;
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('const bar = 1;\nmodule.exports = foo;');
      expect(code).toMatchSnapshot();
    });

    test('moves `module["exports"]` assignment to the bottom of the file', () => {
      const input = html`<script>
        'worklet';
        module["exports"] = foo;
        function foo() {}
        const bar = 1;
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('const bar = 1;\nmodule["exports"] = foo;');
      expect(code).toMatchSnapshot();
    });

    test("doesn't move computed `module[exports]` assignment", () => {
      const input = html`<script>
        'worklet';
        module[exports] = foo;
        function foo() {}
        const bar = 1;
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toContain('const bar = 1;\nmodule[exports] = foo;');
      expect(code).toMatchSnapshot();
    });

    test('moves multiple CommonJS exports to the bottom of the file', () => {
      const input = html`<script>
        'worklet';
        exports.foo = foo;
        exports.bar = bar;
        function foo() {}
        function bar() {}
        function baz() {}
        exports.baz = baz;
        exports.foobar = foobar;
        function foobar() {}
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatchSnapshot();
    });
  });

  describe('for bundle mode flag toggle', () => {
    test('does not flip the flag without bundleMode option', () => {
      const input = html`<script>
        globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;
      </script>`;

      const transformed = transformSync(
        input.replace(/<\/?script[^>]*>/g, ''),
        {
          filename: 'react-native-worklets/src/index.ts',
          compact: false,
          babelrc: false,
          configFile: false,
          plugins: [[plugin, {}]],
        }
      );
      assert(transformed?.code);
      expect(transformed.code).toMatchSnapshot();
    });
  });

  describe('for worklet classes', () => {
    test('removes marker', () => {
      const input = html`<script>
        class Clazz {
          __workletClass = true;
          foo() {
            return 'bar';
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toMatch(/__workletClass:\s*/g);
      expect(code).toMatchSnapshot();
    });

    test('creates factories', () => {
      const input = html`<script>
        class Clazz {
          __workletClass = true;
          foo() {
            return 'bar';
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('Clazz__classFactory');
      expect(code).toContainInWorkletString('Clazz__classFactory');
      expect(code).toMatchSnapshot();
    });

    test('workletizes regardless of marker value', () => {
      const input = html`<script>
        class Clazz {
          __workletClass = new RegExp('foo');
          foo() {
            return 'bar';
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('Clazz__classFactory');
      expect(code).toContainInWorkletString('Clazz__classFactory');
      expect(code).toMatchSnapshot();
    });

    test('injects class factory into worklets', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          const clazz = new Clazz();
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('Clazz__classFactory');
      expect(code).toMatchSnapshot();
    });

    test('modifies closures', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          const clazz = new Clazz();
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('Clazz__classFactory: Clazz.Clazz__classFactory');
      expect(code).toMatchSnapshot();
    });

    test('keeps this binding', () => {
      const input = html`<script>
        class Clazz {
          __workletClass = true;
          member = 1;
          foo() {
            return this.member;
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContainInWorkletString('this.member');
      expect(code).toMatchSnapshot();
    });

    test('appends polyfills', () => {
      const input = html`<script>
        class Clazz {
          __workletClass = true;

          foo() {
            return 'bar';
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('createClass');
      expect(code).toMatchSnapshot();
    });

    test('workletizes polyfills', () => {
      const input = html`<script>
        class Clazz {
          __workletClass = true;

          foo() {
            return 'bar';
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(6);
      expect(code).toMatchSnapshot();
    });

    test('is disabled via option', () => {
      const input = html`<script>
        function foo() {
          this.prop = 42;
        }

        function bar() {
          'worklet';
          const instance = new foo();
        }
      </script>`;

      const { code } = runPlugin(
        input,
        {},
        {
          disableWorkletClasses: true,
        }
      );
      expect(code).not.toContain('foo__classFactory');
      expect(code).toMatchSnapshot();
    });
  });
});

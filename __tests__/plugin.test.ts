import { html } from 'code-tag';
import plugin from '../plugin';
import { TransformOptions, transformSync } from '@babel/core';
import traverse from '@babel/traverse';
import { strict as assert } from 'assert';
import '../plugin/jestUtils';
import { version as packageVersion } from '../package.json';
import { ReanimatedPluginOptions } from '../plugin/src/types';

const MOCK_LOCATION = '/dev/null';

function runPlugin(
  input: string,
  transformOpts: TransformOptions = {},
  pluginOpts: ReanimatedPluginOptions = {}
) {
  const transformed = transformSync(input.replace(/<\/?script[^>]*>/g, ''), {
    // Our babel presets require us to specify a filename here
    // but it is never used so we put in '/dev/null'
    // as a safe fallback.
    filename: MOCK_LOCATION,
    compact: false,
    plugins: [[plugin, pluginOpts]],
    ...transformOpts,
  });
  assert(transformed);
  return transformed;
}

describe('babel plugin', () => {
  beforeEach(() => {
    process.env.REANIMATED_JEST_SHOULD_MOCK_SOURCE_MAP = '1';
    process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION = '1';
  });

  describe('generally', () => {
    it('transforms', () => {
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

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('injects its version', () => {
      process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION = '0'; // don't mock version
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain(`version: "${packageVersion}"`);
    });

    it('injects source maps', () => {
      process.env.REANIMATED_JEST_SHOULD_MOCK_SOURCE_MAP = '0'; // don't mock source maps
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('sourceMap: "{');
      // this non-mocked source map is hard-coded, feel free to update it accordingly
      expect(code).toContain(
        '\\"mappings\\":\\"AACQ,SAAAA,GAASA,CAAA,CAAG,CAEV,GAAI,CAAAA,GAAG,CAAG,KAAK,CACjB\\"'
      );
    });

    it('removes comments from worklets', () => {
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
      expect(code).not.toContain('some comment');
      expect(code).not.toContain('other comment');
      expect(code).toMatchSnapshot();
    });

    it('supports recursive calls', () => {
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
      expect(code).toContain('const foo=this._recur');
      expect(code).toMatchSnapshot();
    });
  });

  describe('for DirectiveLiterals', () => {
    it("doesn't bother other Directive Literals", () => {
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

    it("doesn't transform functions without 'worklet' directive", () => {
      const input = html`<script>
        function f(x) {
          return x + 2;
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('removes "worklet"; directive from worklets', () => {
      const input = html`<script>
        function foo(x) {
          "worklet"; // prettier-ignore
          return x + 2;
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toContain('"worklet";');
      expect(code).toMatchSnapshot();
    });

    it("removes 'worklet'; directive from worklets", () => {
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

    it("doesn't transform string literals", () => {
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
    it('captures worklets environment', () => {
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

    it("doesn't capture default globals", () => {
      const input = html`<script>
        function f() {
          'worklet';
          console.log('test');
        }
      </script>`;

      const { code, ast } = runPlugin(input, { ast: true });
      let closureBindings;
      traverse(ast, {
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

    it("doesn't capture custom globals", () => {
      const input = html`<script>
        const foo = 42;

        function f() {
          'worklet';
          console.log(foo);
        }
      </script>`;

      const { code } = runPlugin(input, undefined, { globals: ['foo'] });
      expect(code).toContain('f.__closure = {};');
      expect(code).toMatchSnapshot();
    });

    it("doesn't capture arguments", () => {
      const input = html`<script>
        function f(a, b, c) {
          'worklet';
          console.log(arguments);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('f.__closure = {};');
      expect(code).toMatchSnapshot();
    });

    it("doesn't capture objects' properties", () => {
      const input = html`<script>
        const foo = { bar: 42 };

        function f() {
          'worklet';
          console.log(foo.bar);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toContain('foo: foo');
      expect(code).toMatchSnapshot();
    });
  });

  describe('for explicit worklets', () => {
    it('workletizes FunctionDeclaration', () => {
      const input = html`<script>
        function foo(x) {
          'worklet';
          return x + 2;
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('workletizes ArrowFunctionExpression', () => {
      const input = html`<script>
        const foo = (x) => {
          'worklet';
          return x + 2;
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('workletizes unnamed FunctionExpression', () => {
      const input = html`<script>
        const foo = function (x) {
          'worklet';
          return x + 2;
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('workletizes named FunctionExpression', () => {
      const input = html`<script>
        const foo = function foo(x) {
          'worklet';
          return x + 2;
        };
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });
  });

  describe('for class worklets', () => {
    it('workletizes instance method', () => {
      const input = html`<script>
        class Foo {
          bar(x) {
            'worklet';
            return x + 2;
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('workletizes static method', () => {
      const input = html`<script>
        class Foo {
          static bar(x) {
            'worklet';
            return x + 2;
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('workletizes getter', () => {
      const input = html`<script>
        class Foo {
          get bar() {
            'worklet';
            return x + 2;
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('workletizes setter', () => {
      const input = html`<script>
        class Foo {
          set bar(x) {
            'worklet';
            this.x = x + 2;
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('workletizes class field', () => {
      const input = html`<script>
        class Foo {
          bar = (x) => {
            'worklet';
            return x + 2;
          };
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('workletizes static class field', () => {
      const input = html`<script>
        class Foo {
          static bar = (x) => {
            'worklet';
            return x + 2;
          };
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('workletizes constructor', () => {
      const input = html`<script>
        class Foo {
          constructor(x) {
            'worklet';
            this.x = x;
          }
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).not.toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });
  });

  describe('for function hooks', () => {
    it('workletizes hook wrapped ArrowFunctionExpression automatically', () => {
      const input = html`<script>
        const animatedStyle = useAnimatedStyle(() => ({
          width: 50,
        }));
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('workletizes hook wrapped unnamed FunctionExpression automatically', () => {
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

    it('workletizes hook wrapped named FunctionExpression automatically', () => {
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
  });

  describe('for runOnUI', () => {
    it('workletizes ArrowFunctionExpression inside runOnUI automatically', () => {
      const input = html`<script>
        runOnUI(() => {
          console.log('Hello from the UI thread!');
        })();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('workletizes unnamed FunctionExpression inside runOnUI automatically', () => {
      const input = html`<script>
        runOnUI(function () {
          console.log('Hello from the UI thread!');
        })();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('workletizes named FunctionExpression inside runOnUI automatically', () => {
      const input = html`<script>
        runOnUI(function hello() {
          console.log('Hello from the UI thread!');
        })();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });
  });

  describe('for object hooks', () => {
    it('workletizes useAnimatedGestureHandler wrapped ArrowFunctionExpression automatically', () => {
      const input = html`<script>
        useAnimatedGestureHandler({
          onStart: (event) => {
            console.log(event);
          },
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('workletizes useAnimatedScrollHandler wrapped ArrowFunctionExpression automatically', () => {
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

    it('workletizes useAnimatedGestureHandler wrapped unnamed FunctionExpression automatically', () => {
      const input = html`<script>
        useAnimatedGestureHandler({
          onStart: function (event) {
            console.log(event);
          },
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('workletizes useAnimatedScrollHandler wrapped unnamed FunctionExpression automatically', () => {
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

    it('workletizes useAnimatedGestureHandler wrapped named FunctionExpression automatically', () => {
      const input = html`<script>
        useAnimatedGestureHandler({
          onStart: function onStart(event) {
            console.log(event);
          },
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('workletizes useAnimatedScrollHandler wrapped named FunctionExpression automatically', () => {
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

    it('workletizes useAnimatedGestureHandler wrapped ObjectMethod automatically', () => {
      const input = html`<script>
        useAnimatedGestureHandler({
          onStart(event) {
            console.log(event);
          },
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('workletizes useAnimatedScrollHandler wrapped ObjectMethod automatically', () => {
      const input = html`<script>
        useAnimatedGestureHandler({
          onScroll(event) {
            console.log(event);
          },
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('supports empty object in useAnimatedGestureHandler', () => {
      const input = html`<script>
        useAnimatedGestureHandler({});
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('supports empty object in useAnimatedScrollHandler', () => {
      const input = html`<script>
        useAnimatedScrollHandler({});
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('transforms each object property in useAnimatedGestureHandler', () => {
      const input = html`<script>
        useAnimatedGestureHandler({
          onStart: () => {},
          onUpdate: () => {},
          onEnd: () => {},
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(3);
      expect(code).toMatchSnapshot();
    });

    it('transforms each object property in useAnimatedScrollHandler', () => {
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

    it("doesn't transform ArrowFunctionExpression as argument of useAnimatedGestureHandler", () => {
      const input = html`<script>
        useAnimatedGestureHandler(() => {});
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it("doesn't transform unnamed FunctionExpression as argument of useAnimatedGestureHandler", () => {
      const input = html`<script>
        useAnimatedGestureHandler(function () {});
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it("doesn't transform named FunctionExpression as argument of useAnimatedGestureHandler", () => {
      const input = html`<script>
        useAnimatedGestureHandler(function foo() {});
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('transforms ArrowFunctionExpression as argument of useAnimatedScrollHandler', () => {
      const input = html`<script>
        useAnimatedScrollHandler((event) => {
          console.log(event);
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('transforms unnamed FunctionExpression as argument of useAnimatedScrollHandler', () => {
      const input = html`<script>
        useAnimatedScrollHandler(function (event) {
          console.log(event);
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('transforms named FunctionExpression as argument of useAnimatedScrollHandler', () => {
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
    it('workletizes possibly chained gesture object callback functions automatically', () => {
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

    it("doesn't workletize irrelevant chained gesture object callback functions", () => {
      const input = html`<script>
        const foo = Gesture.Tap().toString();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it("doesn't transform standard callback functions", () => {
      const input = html`<script>
        const foo = Something.Tap().onEnd((_event, _success) => {
          console.log('onEnd');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it("doesn't transform chained methods of objects containing Gesture property", () => {
      const input = html`<script>
        const foo = Something.Gesture.Tap().onEnd(() => {
          console.log('onEnd');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('transforms spread operator in worklets for arrays', () => {
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

    it('transforms spread operator in worklets for objects', () => {
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

    it('transforms spread operator in worklets for function arguments', () => {
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

    it('transforms spread operator in worklets for function calls', () => {
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

    it('transforms spread operator in Animated component', () => {
      const input = html`<script>
        function App() {
          return (
            <Animated.View
              style={[style, { ...styles.container, width: sharedValue.value }]}
            />
          );
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatchSnapshot();
    });
  });

  describe('for sequence expressions', () => {
    it('supports SequenceExpression', () => {
      const input = html`<script>
        function App() {
          (0, fun)({ onStart() {} }, []);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toMatchSnapshot();
    });

    it('supports SequenceExpression, with objectHook', () => {
      const input = html`<script>
        function App() {
          (0, useAnimatedGestureHandler)({ onStart() {} }, []);
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData();
      expect(code).toMatchSnapshot();
    });

    it('supports SequenceExpression, with worklet', () => {
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

    it('supports SequenceExpression, many arguments', () => {
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

    it('supports SequenceExpression, with worklet closure', () => {
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
      traverse(ast, {
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
    it('shows a warning if user uses .value inside inline style', () => {
      const input = html`<script>
        function App() {
          return <Animated.View style={{ width: sharedValue.value }} />;
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveInlineStyleWarning();
      expect(code).toMatchSnapshot();
    });

    it('shows a warning if user uses .value inside inline style, style array', () => {
      const input = html`<script>
        function App() {
          return (
            <Animated.View style={[style, { width: sharedValue.value }]} />
          );
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveInlineStyleWarning();
      expect(code).toMatchSnapshot();
    });

    it('shows a warning if user uses .value inside inline style, transforms', () => {
      const input = html`<script>
        function App() {
          return (
            <Animated.View
              style={{ transform: [{ translateX: sharedValue.value }] }}
            />
          );
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveInlineStyleWarning();
      expect(code).toMatchSnapshot();
    });

    it("doesn't show a warning if user writes something like style={styles.value}", () => {
      const input = html`<script>
        function App() {
          return <Animated.View style={styles.value} />;
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).not.toHaveInlineStyleWarning();
      expect(code).toMatchSnapshot();
      // });
    });
  });

  describe('is indempotent', () => {
    it('for common cases', () => {
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
        const x = useAnimatedGestureHandler({
          onStart: () => {
            return useAnimatedStyle(() => {
              return 1;
            });
          },
        });
      </script>`;
      expect(resultIsIdempotent(input7)).toBe(true);

      const input8 = html`<script>
        const x = useAnimatedGestureHandler({
          onStart: () => {
            return useAnimatedGestureHandler({
              onStart: () => {
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
    it('workletizes unchained callback functions automatically', () => {
      const input = html`<script>
        FadeIn.withCallback(() => {
          console.log('FadeIn');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    it('workletizes unchained callback functions automatically with new keyword', () => {
      const input = html`<script>
        new FadeIn().withCallback(() => {
          console.log('FadeIn');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    it("doesn't workletize callback functions on unknown objects", () => {
      const input = html`<script>
        AmogusIn.withCallback(() => {
          console.log('AmogusIn');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it("doesn't workletize callback functions on unknown objects with new keyword", () => {
      const input = html`<script>
        new AmogusIn().withCallback(() => {
          console.log('AmogusIn');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it('workletizes callback functions on known chained methods before', () => {
      const input = html`<script>
        FadeIn.build().withCallback(() => {
          console.log('FadeIn with build before');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    it('workletizes callback functions on known chained methods before with new keyword', () => {
      const input = html`<script>
        new FadeIn().build().withCallback(() => {
          console.log('FadeIn with build before');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    it("doesn't workletize callback functions on unknown objects on known chained methods before", () => {
      const input = html`<script>
        AmogusIn.build().withCallback(() => {
          console.log('AmogusIn with build before');
        });
      </script>`;
      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it("doesn't workletize callback functions on unknown objects on known chained methods before with new keyword", () => {
      const input = html`<script>
        new AmogusIn().build().withCallback(() => {
          console.log('AmogusIn with build before');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it('workletizes callback functions on known chained methods after', () => {
      const input = html`<script>
        FadeIn.withCallback(() => {
          console.log('FadeIn with build after');
        }).build();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    it('workletizes callback functions on known chained methods after with new keyword', () => {
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

    it("doesn't workletize callback functions on unknown chained methods before", () => {
      const input = html`<script>
        FadeIn.AmogusIn().withCallback(() => {
          console.log('FadeIn with AmogusIn before');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it("doesn't workletize callback functions on unknown chained methods before with new keyword", () => {
      const input = html`<script>
        new FadeIn().AmogusIn().withCallback(() => {
          console.log('FadeIn with AmogusIn before');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it("doesn't workletize callback functions on unknown objects chained with known objects", () => {
      const input = html`<script>
        AmogusIn.FadeIn().withCallback(() => {
          console.log('AmogusIn with FadeIn after');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it("doesn't workletize callback functions on unknown objects chained with known objects with new keyword", () => {
      const input = html`<script>
        new AmogusIn().FadeIn().withCallback(() => {
          console.log('AmogusIn with FadeIn after');
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it('workletizes callback functions on unknown objects chained after', () => {
      const input = html`<script>
        FadeIn.withCallback(() => {
          console.log('FadeIn with AmogusIn after');
        }).AmogusIn();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    it('workletizes callback functions on unknown objects chained after with new keyword', () => {
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

    it("doesn't workletize callback functions on unknown objects with known object chained after", () => {
      const input = html`<script>
        AmogusIn.withCallback(() => {
          console.log('AmogusIn with FadeIn before');
        }).FadeIn();
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it("doesn't workletize callback functions on unknown objects with known object chained after with new keyword", () => {
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

    it('workletizes callback functions on longer chains of known objects', () => {
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

    it('workletizes callback functions on longer chains of known objects with new keyword', () => {
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
    it('does inject location for worklets in dev builds', () => {
      const input = html`<script>
        const foo = useAnimatedStyle(() => {
          const x = 1;
        });
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveLocation(MOCK_LOCATION);
      expect(code).toMatchSnapshot();
    });

    it("doesn't inject location for worklets in production builds", () => {
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

    it("doesn't inject version for worklets in production builds", () => {
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

    it('throws a tagged exception when worklet processing fails', () => {
      const input = html`<script>
        const foo = useAnimatedStyle(() => {
          return <Image />;
        });
      </script>`;

      expect(() => runPlugin(input)).toThrow('[Reanimated]');
    });
  });

  describe('for worklet nesting', () => {
    it("doesn't process nested worklets when disabled", () => {
      const input = html`<script>
        function foo(x) {
          'worklet';
          function bar(x) {
            'worklet';
            return x + 2;
          }
          return bar(x) + 1;
        }
      </script>`;

      const { code } = runPlugin(input);
      expect(code).toHaveWorkletData(2);
      expect(code).toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('transpiles nested worklets when enabled', () => {
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

      const { code } = runPlugin(input, {}, { processNestedWorklets: true });
      expect(code).toHaveWorkletData(2);
      expect(code).toMatchSnapshot();
    });

    it('transpiles nested worklets when enabled with depth 3', () => {
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

      const { code } = runPlugin(input, {}, { processNestedWorklets: true });

      expect(code).toHaveWorkletData(3);
      expect(code).toMatchSnapshot();
    });

    it('transpiles nested worklets embedded in runOnJS in runOnUI', () => {
      const input = html`<script>
        runOnUI(() => {
          console.log('Hello from UI thread');
          runOnJS(() => {
            'worklet';
            console.log('Hello from JS thread');
          })();
        })();
      </script>`;
      const { code } = runPlugin(input, {}, { processNestedWorklets: true });

      expect(code).toHaveWorkletData(2);
      expect(code).toMatchSnapshot();
    });

    it('transpiles nested worklets embedded in runOnUI in runOnJS in runOnUI', () => {
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
      const { code } = runPlugin(input, {}, { processNestedWorklets: true });

      expect(code).toHaveWorkletData(3);
      expect(code).toMatchSnapshot();
    });

    it('transpiles worklets with functions defined on UI thread to run them on JS', () => {
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
      const { code } = runPlugin(input, {}, { processNestedWorklets: true });

      expect(code).toHaveWorkletData(3);
      expect(code).toMatchSnapshot();
    });
  });

  describe('for Web configuration', () => {
    it('skips initData when REANIMATED_BABEL_PLUGIN_IS_WEB is set', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const current = process.env.REANIMATED_BABEL_PLUGIN_IS_WEB;
      process.env.REANIMATED_BABEL_PLUGIN_IS_WEB = '1';
      const { code } = runPlugin(input);
      process.env.REANIMATED_BABEL_PLUGIN_IS_WEB = current;
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it('skips initData when isWeb option is set', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const { code } = runPlugin(input, {}, { isWeb: true });
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });

    it('includes initData when isWeb option is set to true and is overridden with REANIMATED_BABEL_PLUGIN_IS_WEB', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const current = process.env.REANIMATED_BABEL_PLUGIN_IS_WEB;
      process.env.REANIMATED_BABEL_PLUGIN_IS_WEB = '0';
      const { code } = runPlugin(input, {}, { isWeb: true });
      process.env.REANIMATED_BABEL_PLUGIN_IS_WEB = current;
      expect(code).toHaveWorkletData(1);
      expect(code).toMatchSnapshot();
    });

    it('skips initData when isWeb option is set to false and is overridden with REANIMATED_BABEL_PLUGIN_IS_WEB', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const current = process.env.REANIMATED_BABEL_PLUGIN_IS_WEB;
      process.env.REANIMATED_BABEL_PLUGIN_IS_WEB = '1';
      const { code } = runPlugin(input, {}, { isWeb: false });
      process.env.REANIMATED_BABEL_PLUGIN_IS_WEB = current;
      expect(code).toHaveWorkletData(0);
      expect(code).toMatchSnapshot();
    });
  });
});

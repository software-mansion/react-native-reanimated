import { html } from 'code-tag';
import plugin from '../plugin';
import { transform } from '@babel/core';
import traverse from '@babel/traverse';
import { strict as assert } from 'assert';
import '../plugin/jestUtils';

function runPlugin(input: string, opts = {}) {
  const transformed = transform(input.replace(/<\/?script[^>]*>/g, ''), {
    // Our babel presets require us to specify a filename here
    // but it is never used so we put in '/dev/null'
    // as a safe fallback.
    filename: '/dev/null',
    compact: false,
    plugins: [plugin],
    ...opts,
  });
  assert(transformed);
  return transformed;
}

describe('babel plugin', () => {
  beforeEach(() => {
    process.env.REANIMATED_JEST_DISABLE_SOURCEMAP = 'jest';
    process.env.REANIMATED_JEST_DISABLE_VERSION = 'jest';
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
      delete process.env.REANIMATED_JEST_DISABLE_VERSION;

      const input = html`<script>
        function foo() {
          'worklet';
          var foo = 'bar';
        }
      </script>`;

      const { code } = runPlugin(input, {});
      const { version: packageVersion } = require('../package.json');
      expect(code).toContain(`f.__version = "${packageVersion}";`);
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

      const { code } = runPlugin(input, {});
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

  describe('for worklet nesting', () => {
    it("doesn't nest worklets for other threads", () => {
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
      expect(code).toContain("'worklet';");
      expect(code).toMatchSnapshot();
    });

    it('transforms nested worklets for JS thread', () => {
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
      expect(code).not.toContain('_f._closure = {};');
      expect(code).toMatchSnapshot();
    });

    it("doesn't capture globals", () => {
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
            path.node.left.property.name === '_closure'
          ) {
            closureBindings = path.node.right.properties;
          }
        },
      });
      expect(closureBindings).toEqual([]);
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
            path.node.left.property.name === '_closure'
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

  describe('is indempotent for common cases', () => {
    function resultIsIdempotent(input: string) {
      const firstResult = runPlugin(input).code;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const secondResult = runPlugin(firstResult!).code;
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

  describe('for UIRuntimeChecks', () => {
    it("doesn't change _WORKLET in non-worklets", () => {
      const input = html`<script>
        function foo() {
          if (_WORKLET) {
            return 1;
          }
        }
      </script>`;

      const { code } = runPlugin(input);

      expect(code).toHaveUIRuntimeCheck();
      expect(code).toMatchSnapshot();
    });

    it("doesn't change global._WORKLET in non-worklets", () => {
      const input = html`<script>
        function foo() {
          if (global._WORKLET) {
            return 1;
          }
        }
      </script>`;

      const { code } = runPlugin(input);

      expect(code).toHaveUIRuntimeCheck();
      expect(code).toMatchSnapshot();
    });

    it('changes _WORKLET in worklets', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          if (_WORKLET) {
            return 1;
          }
        }
      </script>`;

      const { code } = runPlugin(input);

      expect(code).toHaveUIRuntimeCheck(1);
      expect(code).toMatchSnapshot();
    });

    it('changes global._WORKLET in worklets', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          if (global._WORKLET) {
            return 1;
          }
        }
      </script>`;

      const { code } = runPlugin(input);

      expect(code).toHaveUIRuntimeCheck(1);
      expect(code).toMatchSnapshot();
    });

    it('changes _WORKLET and global._WORKLET in worklets', () => {
      const input = html`<script>
        function foo() {
          'worklet';
          if (_WORKLET && global._WORKLET) {
            return 1;
          }
        }
      </script>`;

      const { code } = runPlugin(input);

      expect(code).toHaveUIRuntimeCheck(2);
      expect(code).toMatchSnapshot();
    });
  });
});

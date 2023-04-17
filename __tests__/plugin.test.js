import { html } from 'code-tag';
import plugin from '../plugin';
import { transform } from '@babel/core';
import traverse from '@babel/traverse';

function runPlugin(input, opts = {}) {
  return transform(input.replace(/<\/?script>/g, ''), {
    filename: 'jest tests fixture',
    compact: false,
    plugins: [plugin],
    ...opts,
  });
}

describe('babel plugin', () => {
  beforeAll(() => {
    process.env.REANIMATED_PLUGIN_TESTS = 'jest';
  });

  it('injects its version', () => {
    const input = html`<script>
      function foo() {
        'inject Reanimated Babel plugin version';
        var foo = 'bar';
      }
    </script>`;

    const { code } = runPlugin(input, {});
    const { version: packageVersion } = require('../package.json');
    expect(code).toContain(
      `global._REANIMATED_VERSION_BABEL_PLUGIN = "${packageVersion}"`
    );
    expect(code).not.toContain('inject Reanimated Babel plugin version');
  });

  it("doesn't bother other Directive Literals", () => {
    const input = html`<script>
      function foo() {
        'foobar';
        var foo = 'bar';
      }
    </script>`;

    const { code } = runPlugin(input, {});
    expect(code).toContain('foobar');
  });

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
    expect(code).toMatchSnapshot();
  });

  it('supports default ES6 style imports', () => {
    const input = html`<script>
      import * as Reanimated from 'react-native-reanimated';

      function Box() {
        const offset = Reanimated.useSharedValue(0);

        const animatedStyles = Reanimated.useAnimatedStyle(() => {
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
    expect(code).toContain('_closure');
  });

  it("doesn't transform functions without 'worklet' directive", () => {
    const input = html`<script>
      function f(x) {
        return x + 2;
      }
    </script>`;

    const { code } = runPlugin(input);
    expect(code).not.toContain('_f.__workletHash');
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
  });

  it('removes "worklet"; directive from worklets', () => {
    const input = html`<script>
      function foo(x) {
        "worklet"; // prettier-ignore
        return x + 2;
      }
    </script>`;

    const { code } = runPlugin(input);
    expect(code).not.toContain('\\"worklet\\";');
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
    expect(code).toMatchSnapshot();
  });

  it("doesn't remove nested 'worklets'", () => {
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
    expect(code).toMatchSnapshot();
  });

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
          path.node.left.property.name === '_closure'
        ) {
          closureBindings = path.node.right.properties;
        }
      },
    });
    expect(closureBindings).toEqual([]);
    expect(code).toMatchSnapshot();
  });

  // functions

  it('workletizes FunctionDeclaration', () => {
    const input = html`<script>
      function foo(x) {
        'worklet';
        return x + 2;
      }
    </script>`;

    const { code } = runPlugin(input);
    expect(code).toContain('_f.__workletHash');
    expect(code).not.toContain('\\"worklet\\";');
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
    expect(code).toContain('_f.__workletHash');
    expect(code).not.toContain('\\"worklet\\";');
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
    expect(code).toContain('_f.__workletHash');
    expect(code).not.toContain('\\"worklet\\";');
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
    expect(code).toContain('_f.__workletHash');
    expect(code).not.toContain('\\"worklet\\";');
    expect(code).toMatchSnapshot();
  });

  // class methods

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
    expect(code).toContain('_f.__workletHash');
    expect(code).not.toContain('\\"worklet\\";');
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
    expect(code).toContain('_f.__workletHash');
    expect(code).not.toContain('\\"worklet\\";');
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
    expect(code).toContain('_f.__workletHash');
    expect(code).not.toContain('\\"worklet\\";');
    expect(code).toMatchSnapshot();
  });

  // function hooks

  it('workletizes hook wrapped ArrowFunctionExpression automatically', () => {
    const input = html`<script>
      const animatedStyle = useAnimatedStyle(() => ({
        width: 50,
      }));
    </script>`;

    const { code } = runPlugin(input);
    expect(code).toContain('_f.__workletHash');
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
    expect(code).toContain('_f.__workletHash');
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
    expect(code).toContain('_f.__workletHash');
    expect(code).toMatchSnapshot();
  });

  // object hooks

  it('workletizes useAnimatedGestureHandler wrapped ArrowFunctionExpression automatically', () => {
    const input = html`<script>
      useAnimatedGestureHandler({
        onStart: (event) => {
          console.log(event);
        },
      });
    </script>`;

    const { code } = runPlugin(input);
    expect(code).toContain('_f.__workletHash');
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
    expect(code).toContain('_f.__workletHash');
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
    expect(code).toContain('_f.__workletHash');
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
    expect(code).toContain('_f.__workletHash');
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
    expect(code).toContain('_f.__workletHash');
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
    expect(code).toContain('_f.__workletHash');
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
    expect(code).toContain('_f.__workletHash');
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
    expect(code).toContain('_f.__workletHash');
    expect(code).toMatchSnapshot();
  });

  it('supports empty object in useAnimatedGestureHandler', () => {
    const input = html`<script>
      useAnimatedGestureHandler({});
    </script>`;

    const { code } = runPlugin(input);
    expect(code).not.toContain('_f.__workletHash');
  });

  it('supports empty object in useAnimatedScrollHandler', () => {
    const input = html`<script>
      useAnimatedScrollHandler({});
    </script>`;

    const { code } = runPlugin(input);
    expect(code).not.toContain('_f.__workletHash');
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
    expect(code).toMatch(/^(.*)(_f\.__workletHash(.*)){3}$/s);
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
    expect(code).toMatch(/^(.*)(_f\.__workletHash(.*)){5}$/s);
  });

  it("doesn't transform ArrowFunctionExpression as argument of useAnimatedGestureHandler", () => {
    const input = html`<script>
      useAnimatedGestureHandler(() => {});
    </script>`;

    const { code } = runPlugin(input);
    expect(code).not.toContain('_f.__workletHash');
  });

  it("doesn't transform unnamed FunctionExpression as argument of useAnimatedGestureHandler", () => {
    const input = html`<script>
      useAnimatedGestureHandler(function () {});
    </script>`;

    const { code } = runPlugin(input);
    expect(code).not.toContain('_f.__workletHash');
  });

  it("doesn't transform named FunctionExpression as argument of useAnimatedGestureHandler", () => {
    const input = html`<script>
      useAnimatedGestureHandler(function foo() {});
    </script>`;

    const { code } = runPlugin(input);
    expect(code).not.toContain('_f.__workletHash');
  });

  it('transforms ArrowFunctionExpression as argument of useAnimatedScrollHandler', () => {
    const input = html`<script>
      useAnimatedScrollHandler((event) => {
        console.log(event);
      });
    </script>`;

    const { code } = runPlugin(input);
    expect(code).toContain('_f.__workletHash');
  });

  it('transforms unnamed FunctionExpression as argument of useAnimatedScrollHandler', () => {
    const input = html`<script>
      useAnimatedScrollHandler(function (event) {
        console.log(event);
      });
    </script>`;

    const { code } = runPlugin(input);
    expect(code).toContain('_f.__workletHash');
  });

  it('transforms named FunctionExpression as argument of useAnimatedScrollHandler', () => {
    const input = html`<script>
      useAnimatedScrollHandler(function foo(event) {
        console.log(event);
      });
    </script>`;

    const { code } = runPlugin(input);
    expect(code).toContain('_f.__workletHash');
  });

  // React Native Gesture Handler

  it('workletizes possibly chained gesture object callback functions automatically', () => {
    const input = html`<script>
      import { Gesture } from 'react-native-gesture-handler';

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
    expect(code).toMatchSnapshot();
  });

  it("doesn't transform standard callback functions", () => {
    const input = html`<script>
      const foo = Something.Tap().onEnd((_event, _success) => {
        console.log('onEnd');
      });
    </script>`;

    const { code } = runPlugin(input);
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
    expect(code).toMatchSnapshot();
  });

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

    const { code } = runPlugin(input);
    expect(code).toMatchSnapshot();
  });

  it('shows a warning if user uses .value inside inline style', () => {
    const input = html`<script>
      function App() {
        return <Animated.View style={{ width: sharedValue.value }} />;
      }
    </script>`;

    const { code } = runPlugin(input);
    expect(code).toMatchSnapshot();
  });

  it('shows a warning if user uses .value inside inline style, style array', () => {
    const input = html`<script>
      function App() {
        return <Animated.View style={[style, { width: sharedValue.value }]} />;
      }
    </script>`;

    const { code } = runPlugin(input);
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
    expect(code).toMatchSnapshot();
  });

  it("doesn't show a warning if user writes something like style={styles.value}", () => {
    const input = html`<script>
      function App() {
        return <Animated.View style={styles.value} />;
      }
    </script>`;

    const { code } = runPlugin(input);
    expect(code).toMatchSnapshot();
  });

  it("doesn't break if there is a spread syntax", () => {
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

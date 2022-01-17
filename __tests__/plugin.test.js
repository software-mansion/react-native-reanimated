import plugin from '../plugin';
import { transform } from '@babel/core';
import traverse from '@babel/traverse';

function runPlugin(input, opts = {}) {
  return transform(input, {
    filename: 'jest tests fixture',
    compact: false,
    plugins: [plugin],
    ...opts,
  });
}

describe('babel plugin', () => {
  it('transforms', () => {
    const input = `
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
            <Button onPress={() => (offset.value = Math.random())} title="Move" />
          </>
        );
      }
    `;

    const { code } = runPlugin(input);
    expect(code).toMatchSnapshot();
  });

  it('supports default ES6 style imports', () => {
    const input = `
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
            <Button onPress={() => (offset.value = Math.random())} title="Move" />
          </>
        );
      }
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('_closure');
  });

  it("doesn't transform functions without 'worklet' directive", () => {
    const input = `
      function f(x) {
        return x + 2;
      }
    `;

    const { code } = runPlugin(input);
    expect(code).not.toContain('__reanimatedWorkletInit');
  });

  it('removes comments from worklets', () => {
    const input = `
      const f = () => {
        'worklet';
        // some comment
        /*
        * other comment
        */
        return true;
      };
    `;

    const { code } = runPlugin(input);
    expect(code).not.toContain('some comment');
    expect(code).not.toContain('other comment');
  });

  it('removes "worklet"; directive from worklets', () => {
    const input = `
      function foo(x) {
        "worklet"; // prettier-ignore
        return x + 2;
      }
    `;

    const { code } = runPlugin(input);
    expect(code).not.toContain('\\"worklet\\";');
  });

  it("removes 'worklet'; directive from worklets", () => {
    const input = `
      function foo(x) {
        'worklet'; // prettier-ignore
        return x + 2;
      }
    `;

    const { code } = runPlugin(input);
    expect(code).not.toContain("'worklet';");
  });

  it("doesn't transform string literals", () => {
    const input = `
      function foo(x) {
        'worklet';
        const bar = 'worklet'; // prettier-ignore
        const baz = "worklet"; // prettier-ignore
      }
    `;

    const { code } = runPlugin(input);
    expect(code).toMatchSnapshot();
  });

  it('captures worklets environment', () => {
    const input = `
      const x = 5;

      const objX = { x };
      
      function f() {
        'worklet';
        return { res: x + objX.x };
      }
    `;

    const { code } = runPlugin(input);
    expect(code).toMatchSnapshot();
  });

  it("doesn't capture globals", () => {
    const input = `
      function f() {
        'worklet';
        console.log('test');
      }
    `;

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
    const input = `
      function foo(x) {
        'worklet';
        return x + 2;
      }
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).not.toContain('\\"worklet\\";');
    expect(code).toMatchSnapshot();
  });

  it('workletizes ArrowFunctionExpression', () => {
    const input = `
      const foo = (x) => {
        'worklet';
        return x + 2;
      };
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).not.toContain('\\"worklet\\";');
    expect(code).toMatchSnapshot();
  });

  it('workletizes unnamed FunctionExpression', () => {
    const input = `
      const foo = function (x) {
        'worklet';
        return x + 2;
      };
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).not.toContain('\\"worklet\\";');
    expect(code).toMatchSnapshot();
  });

  it('workletizes named FunctionExpression', () => {
    const input = `
      const foo = function foo(x) {
        'worklet';
        return x + 2;
      };
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).not.toContain('\\"worklet\\";');
    expect(code).toMatchSnapshot();
  });

  // class methods

  it('workletizes instance method', () => {
    const input = `
      class Foo {
        bar(x) {
          'worklet';
          return x + 2;
        }
      }
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).not.toContain('\\"worklet\\";');
    expect(code).toMatchSnapshot();
  });

  it('workletizes static method', () => {
    const input = `
      class Foo {
        static bar(x) {
          'worklet';
          return x + 2;
        }
      }
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).not.toContain('\\"worklet\\";');
    expect(code).toMatchSnapshot();
  });

  it('workletizes getter', () => {
    const input = `
      class Foo {
        get bar() {
          'worklet';
          return x + 2;
        }
      }
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).not.toContain('\\"worklet\\";');
    expect(code).toMatchSnapshot();
  });

  // function hooks

  it('workletizes hook wrapped ArrowFunctionExpression automatically', () => {
    const input = `
      const animatedStyle = useAnimatedStyle(() => ({
        width: 50,
      }));
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).toMatchSnapshot();
  });

  it('workletizes hook wrapped unnamed FunctionExpression automatically', () => {
    const input = `
      const animatedStyle = useAnimatedStyle(function () {
        return {
          width: 50,
        };
      });
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).toMatchSnapshot();
  });

  it('workletizes hook wrapped named FunctionExpression automatically', () => {
    const input = `
      const animatedStyle = useAnimatedStyle(function foo() {
        return {
          width: 50,
        };
      });
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).toMatchSnapshot();
  });

  // object hooks

  it('workletizes object hook wrapped ArrowFunctionExpression automatically', () => {
    const input = `
      useAnimatedGestureHandler({
        onStart: (event) => {
          console.log(event);
        },
      });
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).toMatchSnapshot();
  });

  it('workletizes object hook wrapped unnamed FunctionExpression automatically', () => {
    const input = `
      useAnimatedGestureHandler({
        onStart: function (event) {
          console.log(event);
        },
      });
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).toMatchSnapshot();
  });

  it('workletizes object hook wrapped named FunctionExpression automatically', () => {
    const input = `
      useAnimatedGestureHandler({
        onStart: function onStart(event) {
          console.log(event);
        },
      });
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).toMatchSnapshot();
  });

  it('workletizes object hook wrapped ObjectMethod automatically', () => {
    const input = `
      useAnimatedGestureHandler({
        onStart(event) {
          console.log(event);
        },
      });
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('__reanimatedWorkletInit');
    expect(code).toMatchSnapshot();
  });

  it('supports empty object in hooks', () => {
    const input = `
      useAnimatedGestureHandler({});
    `;

    runPlugin(input);
  });

  it('transforms each object property in hooks', () => {
    const input = `
      useAnimatedGestureHandler({
        onStart: () => {},
        onUpdate: () => {},
        onEnd: () => {},
      });
    `;

    const { code } = runPlugin(input);
    expect(code).toMatch(/^(.*)(__reanimatedWorkletInit(.*)){3}$/s);
  });

  // React Native Gesture Handler

  it('workletizes possibly chained gesture object callback functions automatically', () => {
    const input = `
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
    `;

    const { code } = runPlugin(input);
    expect(code).toMatchSnapshot();
  });

  it("doesn't transform standard callback functions", () => {
    const input = `
      const foo = Something.Tap().onEnd((_event, _success) => {
        console.log('onEnd');
      });
    `;

    const { code } = runPlugin(input);
    expect(code).toMatchSnapshot();
  });
});

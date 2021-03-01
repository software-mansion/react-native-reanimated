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
  it('transforms ', () => {
    const input = `
    import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
    
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
    import * as Reanimated from 'react-native-reanimated'

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
      return x+2;
    }
    `;

    const { code } = runPlugin(input);
    expect(code).toMatchSnapshot();
  });

  it('removes comments from worklets', () => {
    const input = `
    const f = () => {
      'worklet'
      // some comment
      /*
      * other comment
      */
      return true;
    }
    `;

    const { code } = runPlugin(input);
    expect(code).not.toContain('some comment');
    expect(code).not.toContain('other comment');
  });

  it('captures worklets environment', () => {
    const input = `
    const x = 5
    const objX = {x}
    function f() {
      'worklet'

      return {res: x + objX.x};
    }
    `;

    const { code } = runPlugin(input);
    expect(code).toMatchSnapshot();
  });

  it('workletize hook wrapped functions automatically', () => {
    const input = `
    const animatedStyle = useAnimatedStyle(() => ({
        width: 50,
      })
    );
    `;

    const { code } = runPlugin(input);
    expect(code).toContain('global.__reanimatedWorkletInit');
  });

  it("doesn't capture globals", () => {
    const input = `
      function f() {
        'worklet'
        console.log("test");
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
});

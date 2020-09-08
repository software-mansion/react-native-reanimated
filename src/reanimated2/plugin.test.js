import plugin from '../../plugin';
import { transform } from '@babel/core';

function runPlugin(input) {
  return transform(input, {
    filename: 'someFile.js',
    compact: false,
    plugins: [plugin],
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

  it('adds closure to worklets', () => {
    const input = `
      function someWorklet(greeting) {
        'worklet';
        console.log("Hey I'm running on the UI thread");
      }`;

    const { code } = runPlugin(input);
    expect(code).toContain('_closure');
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
});

import plugin from '../../plugin';
import { transform } from '@babel/core';
import { format } from 'prettier';

function runPlugin(input) {
  return transform(input, {
    filename: 'someFile.js',
    plugins: [plugin],
  });
}

function prettierOutput(input) {
  return format(input, { parser: 'babel' });
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
    expect(prettierOutput(code)).toMatchSnapshot();
  });

  it('adds closure to worklets', () => {
    const input = `
      function someWorklet(greeting) {
        'worklet';
        console.log("Hey I'm running on the UI thread");
      }`;

    const { code } = runPlugin(input);
    expect(prettierOutput(code)).toContain('_closure');
  });
});

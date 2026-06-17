import Animated from 'react-native-reanimated';
import { Circle, RadialGradient, Svg } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

const AnimatedRadialGradient = Animated.createAnimatedComponent(RadialGradient);

const SIZE = 300;

export default function App() {
  return (
    <View style={styles.container}>
      <Svg height={SIZE} width={SIZE}>
        <AnimatedRadialGradient
          id="grad"
          cx="50%"
          cy="50%"
          r="65%"
          animatedProps={{
            // highlight-start
            // Morph from a 2-stop "sun" to a 4-stop "sunset"
            animationName: {
              from: {
                gradient: [
                  { offset: '0%', color: '#fdbb2d' },
                  { offset: '100%', color: '#22c1c3' },
                ],
              },
              to: {
                gradient: [
                  { offset: '0%', color: '#fdbb2d' },
                  { offset: '30%', color: '#b21f1f' },
                  { offset: '60%', color: '#1a2a6c' },
                  { offset: '100%', color: '#000000' },
                ],
              },
            },
            // highlight-end
            animationDuration: '2s',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            animationTimingFunction: 'ease-in-out',
          }}
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={SIZE / 2 - 10}
          fill="url(#grad)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function App() {
  return (
    <View style={styles.container}>
      <Svg style={styles.svg}>
        <AnimatedCircle
          cx="50%"
          cy="50%"
          r={20}
          fill="#b58df1"
          animatedProps={{
            // highlight-start
            animationName: {
              from: { r: 20 },
              to: { r: 50 },
            },
            animationDuration: '1s',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            animationTimingFunction: 'ease',
            // highlight-end
          }}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: { height: 100, width: '100%' },
});

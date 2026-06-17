import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// highlight-start
const CIRCLE =
  'M50 10 C72 10 90 28 90 50 C90 72 72 90 50 90 C28 90 10 72 10 50 C10 28 28 10 50 10 Z';
const STAR =
  'M50 10 C50 22 78 50 90 50 C78 50 50 78 50 90 C50 78 22 50 10 50 C22 50 50 22 50 10 Z';
// highlight-end

export default function App() {
  return (
    <View style={styles.container}>
      <Svg height={160} width="100%" viewBox="0 0 100 100">
        <AnimatedPath
          fill="#b58df1"
          d={CIRCLE}
          animatedProps={{
            // highlight-start
            animationName: {
              from: { d: CIRCLE },
              to: { d: STAR },
            },
            // highlight-end
            animationDuration: '2s',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            animationTimingFunction: 'ease-in-out',
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
});

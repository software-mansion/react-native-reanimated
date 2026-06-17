import { useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function App() {
  const [grown, setGrown] = useState(false);

  return (
    <View style={styles.container}>
      <Svg style={styles.svg}>
        <AnimatedCircle
          cx="50%"
          cy="50%"
          fill="#b58df1"
          // highlight-next-line
          r={grown ? 50 : 20}
          animatedProps={{
            // highlight-start
            transitionProperty: 'r',
            transitionDuration: 300,
            transitionTimingFunction: 'ease',
            // highlight-end
          }}
        />
      </Svg>
      <Button title="Toggle" onPress={() => setGrown((value) => !value)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  svg: { height: 100, width: '100%' },
});

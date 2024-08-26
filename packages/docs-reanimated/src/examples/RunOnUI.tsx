import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  runOnJS,
  measure,
  useAnimatedRef,
  runOnUI,
  MeasuredDimensions,
} from 'react-native-reanimated';
import useThemedTextStyle from '@site/src/hooks/useThemedTextStyle';

type MeasurableTextProps = React.PropsWithChildren<{
  onPress: (measurements: MeasuredDimensions) => void;
}>;

function MeasurableText(props: MeasurableTextProps) {
  const textColor = useThemedTextStyle();
  const { children, onPress } = props;
  const animatedRef = useAnimatedRef<Animated.View>();

  const handleMeasure = () => {
    // highlight-next-line
    runOnUI(() => {
      const measurements = measure(animatedRef);
      runOnJS(onPress)(measurements);
      // highlight-next-line
    })();
  };

  return (
    <Animated.Text
      style={[styles.title, textColor]}
      onPress={handleMeasure}
      ref={animatedRef}>
      {children}
    </Animated.Text>
  );
}

export default function App() {
  const [text, setText] = React.useState(0);

  const handlePress = (measurements: MeasuredDimensions) => {
    setText(Math.floor(measurements.width));
  };

  return (
    <View style={styles.container}>
      {['React', 'Native', 'Reanimated'].map((word) => (
        <MeasurableText key={word} onPress={handlePress}>
          {word}
        </MeasurableText>
      ))}
      <Text style={styles.label}>width: {text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  box: {
    height: 100,
    width: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
    marginVertical: 64,
    alignSelf: 'center',
  },
  title: {
    fontSize: 42,
    textAlign: 'center',
    fontWeight: 'bold',
    marginRight: 8,
  },
  label: {
    fontSize: 24,
    marginVertical: 16,
    color: '#b58df1',
  },
});

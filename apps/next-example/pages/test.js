/* eslint-disable jsdoc/require-jsdoc */
 
import Animated, {
  PinwheelIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, View, Text, Button } from 'react-native';

export default function App() {
  const sv = useSharedValue(10);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: sv.value,
    };
  });

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.text}>
        This page was created for e2e tests.
      </Text>

      <Button
        title="Start animation"
        onPress={() => {
          sv.value = withTiming(300, { duration: 1000 });
        }}
      />

      <Animated.View
        testID={'box'}
        entering={PinwheelIn}
        style={[styles.box, animatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'grey',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    height: 100,
    backgroundColor: '#b58df1',
    borderRadius: 10,
    margin: 20,
  },
  text: {
    alignItems: 'center',
    fontSize: 40,
    marginBottom: 24,
  },
});

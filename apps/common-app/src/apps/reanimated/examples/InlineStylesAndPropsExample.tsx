import { useCallback } from 'react';
import {
  Button,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

const AnimatedSwitch = Animated.createAnimatedComponent(Switch);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function InlineStylesAndPropsExample() {
  const value = useSharedValue(false);

  const handleToggle = useCallback(() => {
    value.set((current) => !current);
  }, [value]);

  const colorSv = useDerivedValue(() => (value.value ? 'lime' : 'red'));

  const textSv = useDerivedValue(() => String(value.value ?? false));

  const viewAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: colorSv.value,
  }));

  const circleAnimatedProps = useAnimatedProps(() => ({ fill: colorSv.value }));

  const switchAnimatedProps = useAnimatedProps(() => ({ value: value.value }));

  const textInputAnimatedProps = useAnimatedProps(() => ({
    text: textSv.value,
    defaultValue: textSv.value,
  }));

  return (
    <View style={styles.container}>
      <Button title="Toggle" onPress={handleToggle} />

      <Text>View + useAnimatedStyle</Text>
      <Animated.View style={[styles.box, viewAnimatedStyle]} />

      <Text>View + inline style</Text>
      <Animated.View style={[styles.box, { backgroundColor: colorSv }]} />

      <Text>Circle + useAnimatedProps</Text>
      <Svg width={60} height={60}>
        <AnimatedCircle
          cx={30}
          cy={30}
          r={25}
          animatedProps={circleAnimatedProps}
        />
      </Svg>

      <Text>Circle + inline prop</Text>
      <Svg width={60} height={60}>
        <AnimatedCircle cx={30} cy={30} r={25} fill={colorSv} />
      </Svg>

      <Text>Switch + useAnimatedProps</Text>
      <AnimatedSwitch animatedProps={switchAnimatedProps} />

      <Text>Switch + inline prop</Text>
      <AnimatedSwitch value={value} />

      <Text>TextInput + useAnimatedProps</Text>
      <AnimatedTextInput
        editable={false}
        style={styles.input}
        animatedProps={textInputAnimatedProps}
      />

      <Text>TextInput + inline prop</Text>
      <AnimatedTextInput
        editable={false}
        style={styles.input}
        defaultValue="false"
        text={textSv}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    width: 100,
    padding: 4,
    textAlign: 'center',
  },
});

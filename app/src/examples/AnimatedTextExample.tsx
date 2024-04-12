import { StyleSheet, TextInputProps, TextInput } from 'react-native';
import React from 'react';
import Animated, {
  AnimatedProps,
  Easing,
  ReduceMotion,
  SharedValue,
  isSharedValue,
  runOnUI,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedTextProps
  extends Omit<AnimatedProps<TextInputProps>, 'children'> {
  children: any | SharedValue | (any | SharedValue)[];
}

function AnimatedText({ children, ...props }: AnimatedTextProps) {
  if (!Array.isArray(children)) {
    children = [children];
  }

  const animatedInputProps = useAnimatedProps(() => {
    const text = children
      .map((child: any | SharedValue) => {
        if (isSharedValue(child)) {
          return 'format' in child && child.format instanceof Function
            ? child.format(child.value)
            : child.value;
        }

        return child;
      })
      .join('');

    return { text, defaultValue: text };
  });

  return (
    <AnimatedTextInput
      editable={false}
      animatedProps={animatedInputProps}
      {...props}
    />
  );
}

type FormattedValue<T> = SharedValue<T> & { format: (value: T) => any };

function withFormat<T>(value: SharedValue<T>, format: (value: T) => any) {
  runOnUI(() => ((value as any).format = format))();

  return value as FormattedValue<T>;
}

export default function AnimatedTextExample() {
  const currentValue = useSharedValue(0);

  currentValue.value = withRepeat(
    withTiming(currentValue.value + 60, {
      duration: 60000,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.System,
    }),
    0
  );

  return (
    <AnimatedText style={styles.animatedText}>
      {withFormat<number>(currentValue, (value) => {
        'worklet';
        return value.toFixed(0);
      })}{' '}
      PLN
    </AnimatedText>
  );
}

const styles = StyleSheet.create({
  animatedText: {
    fontSize: 24,
    color: 'black',
    textAlign: 'center',
    backgroundColor: 'red',
  },
});

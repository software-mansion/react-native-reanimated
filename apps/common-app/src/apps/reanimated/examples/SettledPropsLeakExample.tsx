import React, { forwardRef, useEffect } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, TextInput, View, Text } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { WithTimingConfig } from 'react-native-reanimated';

const Box = forwardRef<
  React.ComponentRef<typeof TextInput>,
  TextInputProps & { backgroundColor?: string }
>(({ backgroundColor, ...rest }, ref) => {
  if (backgroundColor !== undefined) {
    throw new Error(
      `Wrapped component received animated style value backgroundColor=${backgroundColor} as a top-level prop`
    );
  }
  return <TextInput ref={ref} editable={false} {...rest} />;
});

const AnimatedBox = Animated.createAnimatedComponent(Box);

const SLOW_TIMING_CONFIG: WithTimingConfig = { duration: 1000 };

export default function SettledPropsLeakExample() {
  const defaultBoxProps = useBoxProps();
  const slowBoxProps = useBoxProps(SLOW_TIMING_CONFIG);

  return (
    <View style={styles.container}>
      <Text>
        The boxes below animate from red to lime and from 0 to 100. Once the
        animations settle, the input should stay lime and display 100.
      </Text>
      <View style={styles.examples}>
        <Text>useAnimatedStyle + useAnimatedProps</Text>
        <View style={styles.row}>
          <AnimatedBox
            style={[styles.box, defaultBoxProps.animatedStyle]}
            animatedProps={defaultBoxProps.animatedProps}
          />
          <AnimatedBox
            style={[styles.box, slowBoxProps.animatedStyle]}
            animatedProps={slowBoxProps.animatedProps}
          />
        </View>
        <Text>inline styles + inline props</Text>
        <View style={styles.row}>
          <AnimatedBox
            style={[
              styles.box,
              { backgroundColor: defaultBoxProps.backgroundColor },
            ]}
            // @ts-expect-error `text` is the native prop backing TextInput's value
            text={defaultBoxProps.text}
            defaultValue={defaultBoxProps.text}
          />
          <AnimatedBox
            style={[
              styles.box,
              { backgroundColor: slowBoxProps.backgroundColor },
            ]}
            // @ts-expect-error `text` is the native prop backing TextInput's value
            text={slowBoxProps.text}
            defaultValue={slowBoxProps.text}
          />
        </View>
      </View>
    </View>
  );
}

function useBoxProps(timingConfig?: WithTimingConfig) {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = withTiming(1, timingConfig);
  }, [sv, timingConfig]);

  const text = useDerivedValue(() => `${Math.round(sv.value * 100)}`);

  const backgroundColor = useDerivedValue(() =>
    interpolateColor(sv.value, [0, 1], ['red', 'lime'])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sv.value, [0, 1], ['red', 'lime']),
  }));

  const animatedProps = useAnimatedProps(() => ({
    text: text.value,
    defaultValue: text.value,
  }));

  return { animatedStyle, animatedProps, backgroundColor, text };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50,
    gap: 12,
  },
  examples: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  box: {
    width: 100,
    height: 100,
    textAlign: 'center',
  },
});

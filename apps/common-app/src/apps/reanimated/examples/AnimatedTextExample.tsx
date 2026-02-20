import React, { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// TODO: add support for the following syntax: <Animated.Text>{sharedValue}</Animated.Text>
// TODO: add support for the following syntax: <Animated.Text>Before {sharedValue} After</Animated.Text>
// TODO: add TypeScript validation that allows <Animated.Text> to either have children or have `text` animated prop
// TODO: add gauges example
// TODO: sync `text` prop updates back to React as `children` prop
// TODO: add docs about Animated.Text
// TODO: convert docs examples from AnimatedTextInput to Animated.Text

export default function AnimatedTextExample() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [sv]);

  const textSv = useDerivedValue(() => {
    return String(Math.round(sv.value * 100));
  });

  const stringAnimatedProps = useAnimatedProps(() => {
    return {
      text: `${Math.round(sv.value * 100)}%`, // string
    };
  });

  const numberAnimatedProps = useAnimatedProps(() => {
    return {
      text: Math.round(sv.value * 100), // number
    };
  });

  const emptyAnimatedProps = useAnimatedProps(() => {
    return {
      text: sv.value > 0.5 ? 'Blink' : '', // empty string sometimes
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      fontSize: interpolate(sv.value, [0, 1], [10, 20]),
    };
  });

  const [show, setShow] = useState(false);

  const [, setCount] = useState(0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Animated text is an inline prop */}
      {/* TODO: fix this example not working after fast refresh */}
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text
          text={textSv}
          style={[styles.tabularNums, styles.color0]}
        />
        <Text>After</Text>
      </View>

      {/* Animated text is a string */}
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text
          animatedProps={stringAnimatedProps}
          style={[styles.tabularNums, styles.color1]}
        />
        <Text>After</Text>
      </View>

      {/* Animated text is a number */}
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text
          animatedProps={numberAnimatedProps}
          style={[styles.tabularNums, styles.color2]}
        />
        <Text>After</Text>
      </View>

      {/* Animated text is an empty string during first render */}
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text
          animatedProps={emptyAnimatedProps}
          style={[styles.tabularNums, styles.color3]}
        />
        <Text>After</Text>
      </View>

      {/* With animated style */}
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text
          animatedProps={numberAnimatedProps}
          style={[styles.tabularNums, styles.color4, animatedStyle]}
        />
        <Text>After</Text>
      </View>

      {/* Inside another Text component */}
      <View style={styles.row}>
        <Text style={styles.italic}>
          Before
          <Animated.Text
            animatedProps={numberAnimatedProps}
            style={[styles.tabularNums, styles.color5]}
          />
          After
        </Text>
      </View>

      {/* Inside another Animated.Text */}
      <View style={styles.row}>
        <Animated.Text style={styles.italic}>
          Before
          <Animated.Text
            animatedProps={numberAnimatedProps}
            style={[styles.tabularNums, styles.color6]}
          />
          After
        </Animated.Text>
      </View>

      {/* Inside another Animated.Text with animatedStyle */}
      <View style={styles.row}>
        <Animated.Text style={[styles.italic, animatedStyle]}>
          Before
          <Animated.Text
            animatedProps={numberAnimatedProps}
            style={[styles.tabularNums, styles.color7]}
          />
          After
        </Animated.Text>
      </View>

      {/* Non-empty Animated.Text */}
      <View style={styles.row}>
        <Animated.Text>Lorem ipsum</Animated.Text>
      </View>

      {/* Non-empty Animated.Text with animated style */}
      <View style={styles.row}>
        <Animated.Text style={animatedStyle}>Lorem ipsum</Animated.Text>
      </View>

      {/* Non-empty Animated.Text with animated text (throws an error) */}
      <View style={styles.row}>
        {show && (
          // @ts-expect-error We don't want to accept text in animatedProps when children are present
          <Animated.Text animatedProps={stringAnimatedProps}>
            Lorem ipsum
          </Animated.Text>
        )}
        <Button
          title="Render non-empty Animated.Text with animated text (throws an error)"
          onPress={() => setShow(true)}
        />
      </View>

      <View style={styles.row}>
        <Button
          title="Force re-render"
          onPress={() => setCount((c) => c + 1)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 30,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
  italic: {
    fontStyle: 'italic',
  },
  color0: {
    backgroundColor: 'burlywood',
  },
  color1: {
    backgroundColor: 'pink',
  },
  color2: {
    backgroundColor: 'peachpuff',
  },
  color3: {
    backgroundColor: 'khaki',
  },
  color4: {
    backgroundColor: 'palegreen',
  },
  color5: {
    backgroundColor: 'lightskyblue',
  },
  color6: {
    backgroundColor: 'lightsteelblue',
  },
  color7: {
    backgroundColor: 'thistle',
  },
});

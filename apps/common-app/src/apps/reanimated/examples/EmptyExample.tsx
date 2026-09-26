import React, { useRef, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function EmptyExample() {
  const ref = useRef(0);

  const sv = useSharedValue(0);

  const textSv = useDerivedValue(() => {
    return String(Math.round(sv.value * 100));
  });

  const numberSv = useDerivedValue(() => {
    return Math.round(sv.value * 100);
  });

  const emptySv = useDerivedValue<string>(() => {
    return sv.value > 0.5 ? 'Blink' : '';
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      fontSize: Math.round(interpolate(sv.value, [0, 1], [10, 20]) * 5) / 5,
    };
  });

  const colorStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(sv.value, [0, 1], ['black', 'white']),
      backgroundColor: interpolateColor(sv.value, [0, 1], ['pink', 'black']),
      fontSize: 8 + sv.value * 32,
    };
  });

  const [, setCount] = useState(0);
  const [pressCount, setPressCount] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);

  const opacityStyle = useAnimatedStyle(() => {
    return { opacity: 0.2 + sv.value * 0.8 };
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.row}>
        <Button
          title="Toggle"
          onPress={() => {
            ref.current = 1 - ref.current;
            sv.set(withTiming(ref.current, { duration: 1000 }));
          }}
        />
      </View>

      {/* String shared value as children, with animated style */}
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text style={[styles.tabularNums, colorStyle]}>
          {textSv}
        </Animated.Text>
        <Text>After</Text>
      </View>

      {/* Number shared value as children */}
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text style={[styles.tabularNums, styles.color1]}>
          {numberSv}
        </Animated.Text>
        <Text>After</Text>
      </View>

      {/* Empty string during first render */}
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text style={[styles.tabularNums, styles.color2]}>
          {emptySv}
        </Animated.Text>
        <Text>After</Text>
      </View>

      {/* Mixed children: shared value with a suffix */}
      <View style={styles.row}>
        <Animated.Text style={[styles.tabularNums, styles.color3]}>
          {numberSv}%
        </Animated.Text>
      </View>

      {/* Mixed children: static text around a shared value */}
      <View style={styles.row}>
        <Animated.Text style={[styles.tabularNums, styles.color4]}>
          Before{textSv}After
        </Animated.Text>
      </View>

      {/* Mixed children: multiple shared values */}
      <View style={styles.row}>
        <Animated.Text style={[styles.tabularNums, styles.color5]}>
          Before{textSv}Middle{numberSv}After
        </Animated.Text>
      </View>

      {/* Mixed children with animated style on the outer text */}
      <View style={styles.row}>
        <Animated.Text
          style={[styles.tabularNums, styles.color6, animatedStyle]}>
          Value: {numberSv}
        </Animated.Text>
      </View>

      {/* Inside a plain Text component */}
      <View style={styles.row}>
        <Text style={styles.italic}>
          Before
          <Animated.Text style={[styles.tabularNums, styles.color7]}>
            {numberSv}
          </Animated.Text>
          After
        </Text>
      </View>

      {/* Inside another Animated.Text with animated style */}
      <View style={styles.row}>
        <Animated.Text style={[styles.italic, animatedStyle]}>
          Before
          <Animated.Text style={[styles.tabularNums, styles.color8]}>
            {numberSv}
          </Animated.Text>
          After
        </Animated.Text>
      </View>

      {/* Nested text + lineHeight (known Fabric iOS baseline bug) */}
      <View style={styles.row}>
        <Animated.Text style={[styles.lineHeight, styles.color1]}>
          My {numberSv}% should sit on the same line as this text
        </Animated.Text>
      </View>

      {/* Nested text + numberOfLines truncation */}
      <View style={[styles.row, styles.narrow]}>
        <Animated.Text numberOfLines={1} style={styles.color2}>
          I am a long text and should be trimmed {textSv} tralalalalalalalalala
        </Animated.Text>
      </View>

      {/* onPress on the outer text should also fire when tapping the number */}
      <View style={styles.row}>
        <Animated.Text
          style={styles.color3}
          onPress={() => setPressCount((c) => c + 1)}>
          Tapping my {numberSv} should count up too (pressed {pressCount})
        </Animated.Text>
      </View>

      {/* onLayout on the outer text should follow the animated width */}
      <View style={styles.row}>
        <Animated.Text
          style={styles.color4}
          onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}>
          My width should grow with {textSv}
        </Animated.Text>
        <Text> = {Math.round(layoutWidth)}</Text>
      </View>

      {/* Opacity on the outer text works (it has a native view) */}
      <View style={styles.row}>
        <Animated.Text style={[styles.color5, opacityStyle]}>
          My opacity should be changing {numberSv}
        </Animated.Text>
      </View>

      {/* Opacity on a nested text applies only to that text */}
      <View style={styles.row}>
        <Text style={styles.color6}>
          Only my number should fade, not this text{' '}
          <Animated.Text style={opacityStyle}>{numberSv}</Animated.Text>
        </Text>
      </View>

      {/* Static Animated.Text */}
      <View style={styles.row}>
        <Animated.Text style={animatedStyle}>Lorem ipsum</Animated.Text>
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
    marginBottom: 16,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
  italic: {
    fontStyle: 'italic',
  },
  lineHeight: {
    fontSize: 14,
    lineHeight: 40,
  },
  narrow: {
    width: 220,
  },
  color1: {
    backgroundColor: 'coral',
  },
  color2: {
    backgroundColor: 'sandybrown',
  },
  color3: {
    backgroundColor: 'navajowhite',
  },
  color4: {
    backgroundColor: 'khaki',
  },
  color5: {
    backgroundColor: 'lightgreen',
  },
  color6: {
    backgroundColor: 'mediumaquamarine',
  },
  color7: {
    backgroundColor: 'turquoise',
  },
  color8: {
    backgroundColor: 'powderblue',
  },
});

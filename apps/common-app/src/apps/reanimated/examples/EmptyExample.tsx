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

  const prefixedSv = useDerivedValue(() => {
    return `T${Math.round(sv.value * 100)}`;
  });

  const boxStyle = useAnimatedStyle(() => {
    return { width: 20 + sv.value * 200 };
  });

  const fadeSv = useSharedValue(1);
  const fadeStyle = useAnimatedStyle(() => {
    return { opacity: fadeSv.value };
  });

  const [flag, setFlag] = useState(true);
  const [remountKey, setRemountKey] = useState(0);

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <Button
          title="Toggle"
          onPress={() => {
            ref.current = 1 - ref.current;
            sv.set(withTiming(ref.current, { duration: 1000 }));
          }}
        />
        <Button title={`Flag: ${flag}`} onPress={() => setFlag((f) => !f)} />
        <Button
          title="Force re-render"
          onPress={() => setCount((c) => c + 1)}
        />
        <Button
          title="Block JS 500 ms"
          onPress={() => {
            const start = performance.now();
            while (performance.now() < start + 500) {
              // busy loop
            }
          }}
        />
        <Button
          title="Toggle opacity"
          onPress={() => fadeSv.set(fadeSv.get() === 1 ? 0.3 : 1)}
        />
        <Button title="Remount" onPress={() => setRemountKey((k) => k + 1)} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Text and a plain animated style keep going while JS is blocked */}
        <View style={styles.row}>
          <Animated.Text style={[styles.tabularNums, styles.color1]}>
            {textSv}
          </Animated.Text>
          <Animated.View style={[styles.box, boxStyle]} />
        </View>

        {/* Text and an independent opacity on the same node */}
        <View style={styles.row}>
          <Animated.Text style={[styles.tabularNums, styles.color2, fadeStyle]}>
            {textSv}
          </Animated.Text>
        </View>

        {/* Remounting shows the current value */}
        <View style={styles.row}>
          <Animated.Text
            key={remountKey}
            style={[styles.tabularNums, styles.color3]}>
            {textSv}
          </Animated.Text>
        </View>

        {/* flag ? numberSv : prefixedSv */}
        <View style={styles.row}>
          <Animated.Text style={[styles.tabularNums, styles.color4]}>
            {flag ? numberSv : prefixedSv}
          </Animated.Text>
        </View>

        {/* flag ? numberSv : '' / undefined / null */}
        <View style={styles.row}>
          <Animated.Text style={[styles.tabularNums, styles.color5]}>
            {flag ? numberSv : ''}
          </Animated.Text>
          <Animated.Text style={[styles.tabularNums, styles.color6]}>
            {flag ? numberSv : undefined}
          </Animated.Text>
          <Animated.Text style={[styles.tabularNums, styles.color7]}>
            {flag ? numberSv : null}
          </Animated.Text>
        </View>

        {/* Animated opacity AND flag ? {textSv} : static text */}
        <View style={styles.row}>
          {flag ? (
            <Animated.Text
              style={[styles.tabularNums, styles.color8, opacityStyle]}>
              {textSv}
            </Animated.Text>
          ) : (
            <Animated.Text
              style={[styles.tabularNums, styles.color8, opacityStyle]}>
              Static
            </Animated.Text>
          )}
        </View>

        {/* Animated opacity AND flag ? Value: {textSv}% : static text */}
        <View style={styles.row}>
          {flag ? (
            <Animated.Text
              style={[styles.tabularNums, styles.color1, opacityStyle]}>
              Value: {textSv}%
            </Animated.Text>
          ) : (
            <Animated.Text
              style={[styles.tabularNums, styles.color1, opacityStyle]}>
              Static
            </Animated.Text>
          )}
        </View>

        {/* flag ? {textSv} : Value: {textSv}% */}
        <View style={styles.row}>
          {flag ? (
            <Animated.Text style={[styles.tabularNums, styles.color2]}>
              {textSv}
            </Animated.Text>
          ) : (
            <Animated.Text style={[styles.tabularNums, styles.color2]}>
              Value: {textSv}%
            </Animated.Text>
          )}
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
            I am a long text and should be trimmed {textSv}{' '}
            tralalalalalalalalala
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  container: {
    alignItems: 'center',
    paddingVertical: 16,
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
  box: {
    height: 20,
    marginLeft: 8,
    backgroundColor: 'royalblue',
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

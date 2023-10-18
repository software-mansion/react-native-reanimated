import { Text, StyleSheet, View, Button } from 'react-native';

import React from 'react';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function DynamicStylesExample() {
  const [extraStyle, setState] = React.useState(false);
  const [rerender, setRerender] = React.useState(false);
  const widthShared = useSharedValue(80);
  const backgroundColorShared = useSharedValue<string>('rgb(255,127,63)');
  const transformScaleYShared = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ width: widthShared.value }));
  const animatedStyle2 = useAnimatedStyle(() => {
    return {
      backgroundColor: backgroundColorShared.value,
    };
  });

  function handleChangeProps() {
    setState(!extraStyle);
  }
  function handleAnimate() {
    widthShared.value = withTiming(Math.random() * 160);
    backgroundColorShared.value = withTiming(
      `rgb(${Math.random() * 256},${Math.random() * 256},${
        Math.random() * 256
      })`
    );
    transformScaleYShared.value = withTiming(Math.random());
  }

  function handleForceRerender() {
    setRerender(!rerender);
  }

  return (
    <View style={styles.container}>
      <Text>State: {String(rerender)}</Text>
      <View style={styles.row}>
        <View style={styles.container}>
          <Text>InlineStyles</Text>

          <Text>Same length array</Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              { width: widthShared },
              extraStyle
                ? {
                    backgroundColor: backgroundColorShared,
                  }
                : null,
            ]}
          />

          <Text>Different length array</Text>
          <Animated.View
            accessible={rerender}
            style={
              extraStyle
                ? [
                    styles.box,
                    { width: widthShared },
                    { backgroundColor: backgroundColorShared },
                  ]
                : [styles.box, { width: widthShared }]
            }
          />
          <Text>Same length extra plain style array</Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              { width: widthShared },
              extraStyle ? { backgroundColor: backgroundColorShared } : null,
              extraStyle ? styles.radius : null,
            ]}
          />
          <Text>Different length extra plain style array</Text>
          <Animated.View
            accessible={rerender}
            style={
              extraStyle
                ? [
                    styles.box,
                    { width: widthShared },
                    { backgroundColor: backgroundColorShared },
                    styles.radius,
                  ]
                : [styles.box, { width: widthShared }]
            }
          />
          <Text>Two animated styles independent of state</Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              { width: widthShared },
              { backgroundColor: backgroundColorShared },
            ]}
          />
        </View>
        <View style={styles.container}>
          {/* ----------------------- USE ANIMATED STYLE ----------------------------- */}

          <Text>useAnimatedStyle</Text>

          <Text>Same length array</Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              animatedStyle,
              extraStyle ? animatedStyle2 : null,
            ]}
          />
          <Text>Different length array</Text>
          <Animated.View
            accessible={rerender}
            style={
              extraStyle
                ? [styles.box, animatedStyle, animatedStyle2]
                : [styles.box, animatedStyle]
            }
          />
          <Text>Same length extra plain style array</Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              animatedStyle,
              extraStyle ? animatedStyle2 : null,
              extraStyle ? styles.radius : null,
            ]}
          />
          <Text>Different length extra plain style array</Text>
          <Animated.View
            accessible={rerender}
            style={
              extraStyle
                ? [styles.box, animatedStyle, animatedStyle2, styles.radius]
                : [styles.box, animatedStyle]
            }
          />
          <Text>Two animated styles independent of state</Text>
          <Animated.View
            accessible={rerender}
            style={[styles.box, animatedStyle, animatedStyle2]}
          />
        </View>
      </View>

      <Text>
        {extraStyle ? 'extra animated style' : 'no extra animated style'}
      </Text>
      <Button title="Add/remove animated style" onPress={handleChangeProps} />
      <Button title="Force rerender" onPress={handleForceRerender} />
      <Button title="Animate" onPress={handleAnimate} />
    </View>
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
  },
  box: {
    height: 50,
    width: 50,
    borderWidth: 1,
  },
  radius: {
    borderRadius: 20,
  },
});

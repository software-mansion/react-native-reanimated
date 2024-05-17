import { Text, StyleSheet, View, Button } from 'react-native';

import React from 'react';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function DynamicStylesExample() {
  const [extraStyle, setExtraStyle] = React.useState(false);
  const [rerender, setRerender] = React.useState(false);

  const widthShared = useSharedValue(80);
  const backgroundColorShared = useSharedValue<string>('rgb(255,127,63)');

  const animatedWidthStyle = useAnimatedStyle(() => ({
    width: widthShared.value,
  }));
  const animatedBackgroundColorStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: backgroundColorShared.value,
    };
  });

  function handleChangeProps() {
    setExtraStyle((extraStyle) => !extraStyle);
  }

  function handleAnimate() {
    widthShared.value = withTiming((Math.random() * 160) / 2 + 40, {
      duration: 1000,
    });

    const r = Math.random() * 256;
    const g = Math.random() * 256;
    const b = Math.random() * 256;

    backgroundColorShared.value = withTiming(`rgb(${r},${g},${b})`, {
      duration: 1500,
    });
  }

  function handleForceRerender() {
    setRerender(!rerender);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>State: {String(rerender)}</Text>
      <View style={styles.columnContainer}>
        <View style={styles.column}>
          <Text style={styles.text}>InlineStyles</Text>

          <Text style={styles.text}>Same length array</Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              { width: widthShared },
              extraStyle ? { backgroundColor: backgroundColorShared } : null,
            ]}
          />

          <Text style={styles.text}>Different length array</Text>
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
          <Text style={styles.text}>Same length extra plain style array</Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              { width: widthShared },
              extraStyle ? { backgroundColor: backgroundColorShared } : null,
              extraStyle ? styles.radius : null,
            ]}
          />
          <Text style={styles.text}>
            Different length extra plain style array
          </Text>
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
          <Text style={styles.text}>
            Two animated styles independent of state
          </Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              { width: widthShared },
              { backgroundColor: backgroundColorShared },
            ]}
          />
        </View>
        <View style={styles.column}>
          <Text style={styles.text}>useAnimatedStyle</Text>

          <Text style={styles.text}>Same length array</Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              animatedWidthStyle,
              extraStyle ? animatedBackgroundColorStyle : null,
            ]}
          />
          <Text style={styles.text}>Different length array</Text>
          <Animated.View
            accessible={rerender}
            style={
              extraStyle
                ? [styles.box, animatedWidthStyle, animatedBackgroundColorStyle]
                : [styles.box, animatedWidthStyle]
            }
          />
          <Text style={styles.text}>Same length extra plain style array</Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              animatedWidthStyle,
              extraStyle ? animatedBackgroundColorStyle : null,
              extraStyle ? styles.radius : null,
            ]}
          />
          <Text style={styles.text}>
            Different length extra plain style array
          </Text>
          <Animated.View
            accessible={rerender}
            style={
              extraStyle
                ? [
                    styles.box,
                    animatedWidthStyle,
                    animatedBackgroundColorStyle,
                    styles.radius,
                  ]
                : [styles.box, animatedWidthStyle]
            }
          />
          <Text style={styles.text}>
            Two animated styles independent of state
          </Text>
          <Animated.View
            accessible={rerender}
            style={[
              styles.box,
              animatedWidthStyle,
              animatedBackgroundColorStyle,
            ]}
          />
        </View>
      </View>

      <Text style={styles.text}>
        {extraStyle ? '' : 'no '}extra animated style
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
  columnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  box: {
    height: 50,
    width: 50,
    borderWidth: 1,
  },
  radius: {
    borderWidth: 10,
  },
  column: {
    maxWidth: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    maxWidth: 180,
    textAlign: 'center',
  },
});

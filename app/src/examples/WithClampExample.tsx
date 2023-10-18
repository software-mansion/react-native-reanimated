import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withClamp,
} from 'react-native-reanimated';
import { View, Text, Button, StyleSheet, ViewStyle } from 'react-native';
import React, { useState } from 'react';

const VIOLET = '#b58df1';
const BORDER_WIDTH = 4;
const FRAME_WIDTH = 300;

function renderFramedExample(testedStyle: ViewStyle, description: string) {
  return (
    <>
      <Text style={styles.text}>{description}</Text>
      <View
        style={{
          width: FRAME_WIDTH + 2 * BORDER_WIDTH,
          borderWidth: BORDER_WIDTH,
          borderColor: VIOLET,
        }}>
        <Animated.View
          style={[styles.clampMarker, { marginBottom: -40, width: 220 }]}
        />
        <Animated.View style={[styles.movingBox, testedStyle]} />
        <Animated.View
          style={[
            styles.clampMarker,
            { marginTop: -40, width: 300 - 120, alignSelf: 'flex-end' },
          ]}
        />
      </View>
    </>
  );
}

export default function AnimatedStyleUpdateExample() {
  const randomWidth = useSharedValue(100);
  const [toggle, setToggle] = useState(false);

  const config = {
    duration: 25000,
    dampingRatio: 0.075,
    clamp: [120, 220],
  };

  const clampedStyle = useAnimatedStyle(() => {
    return {
      width: withClamp(
        { min: 120, max: 220 },
        withSpring(randomWidth.value, config)
      ),
    };
  });
  const style = useAnimatedStyle(() => {
    return {
      width: withSpring(randomWidth.value, config),
    };
  });

  return (
    <View style={styles.container}>
      {renderFramedExample(clampedStyle, 'Clamp example')}

      {renderFramedExample(style, 'Default')}
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = toggle ? 150 : 200;
          setToggle(!toggle);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    padding: 40,
  },
  clampMarker: {
    margin: 0,
    opacity: 0.5,
    height: 40,
    backgroundColor: VIOLET,
  },
  movingBox: {
    height: 100,
    opacity: 0.5,
    backgroundColor: 'black',
  },
  text: {
    fontSize: 16,
    marginVertical: 4,
  },
});

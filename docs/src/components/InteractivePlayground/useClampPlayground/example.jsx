import React from 'react';
import { Button, StyleSheet, View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withClamp, withSpring } from 'react-native-reanimated';


const VIOLET = '#b58df1';
const BORDER_WIDTH = 4;
const FRAME_WIDTH = 300;
const CLAMP_MARKER_HEIGHT = 40;

// Modify this values to change clamp limits
const LOWER_BOUND = 120;
const UPPER_BOUND = 220;





export default function useClampPlayground() {
  const width = useSharedValue(100);

  const config = {
    duration: 25000,
    dampingRatio: 0.075,
  };

  const clampedStyle = useAnimatedStyle(() => {
    return {
      width: withClamp(
        { min: LOWER_BOUND, max: UPPER_BOUND },
        withSpring(width.value, config)
      ),
    };
  });

  function renderExample(testedStyle, description) {
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
            style={[
              styles.clampMarker,
              { marginBottom: -CLAMP_MARKER_HEIGHT, width: UPPER_BOUND },
            ]}
          />
          <Animated.View style={[styles.movingBox, testedStyle]} />
          <Animated.View
            style={[
              styles.clampMarker,
              {
                marginTop: -CLAMP_MARKER_HEIGHT,
                width: FRAME_WIDTH - LOWER_BOUND,
                alignSelf: 'flex-end',
              },
            ]}
          />
        </View>
      </>
    );
  }

  
  return (
    <View style={styles.container}>
        {renderExample(clampedStyle, 'Clamped spring')}

      <Button
        title="toggle"
        onPress={() => {
          width.value = width.value  === 150 ? 200 : 150;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    padding: CLAMP_MARKER_HEIGHT,
  },
  clampMarker: {
    margin: 0,
    opacity: 0.5,
    height: CLAMP_MARKER_HEIGHT,
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

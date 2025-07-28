import React, { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  SharedValue,
  Reanimated3DefaultSpringConfig,
  Reanimated3DefaultSpringConfigWithDuration,
  GentleSpringConfig,
  GentleSpringConfigWithDuration,
  WigglySpringConfig,
  WigglySpringConfigWithDuration,
  SnappySpringConfig,
  SnappySpringConfigWithDuration,
} from 'react-native-reanimated';

const VIOLET = '#b58df1';
const BORDER_WIDTH = 4;
const FRAME_WIDTH = 350;
const CLAMP_MARKER_HEIGHT = 20;
const CLAMP_MARKER_WIDTH = 50;
const CLAMP_MARKER_OFFSET = 20;

const LOWER_SPRING_TO_VALUE = CLAMP_MARKER_WIDTH + CLAMP_MARKER_OFFSET;
const UPPER_SPRING_TO_VALUE =
  FRAME_WIDTH - (CLAMP_MARKER_WIDTH + CLAMP_MARKER_OFFSET);

function Visualiser({
  description,
  sv,
}: {
  description: string;
  sv: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleX: sv.value / LOWER_SPRING_TO_VALUE,
        },
      ],
    };
  });
  return (
    <>
      <Text style={styles.text}>{description}</Text>
      <View
        style={{
          width: FRAME_WIDTH + 2 * BORDER_WIDTH,
          borderWidth: BORDER_WIDTH,
          borderColor: VIOLET,
        }}>
        <View>
          <View
            style={[
              styles.toValueMarker,
              {
                width: LOWER_SPRING_TO_VALUE,
              },
            ]}
          />
          <View
            style={[
              styles.clampMarker,
              {
                width: CLAMP_MARKER_WIDTH,
              },
            ]}
          />
        </View>
        <Animated.View style={[styles.movingBox, animatedStyle]} />
        <View>
          <View
            style={[
              styles.toValueMarker,
              {
                marginTop: -CLAMP_MARKER_HEIGHT / 2,
                width: LOWER_SPRING_TO_VALUE,
                alignSelf: 'flex-end',
              },
            ]}
          />
          <View
            style={[
              styles.clampMarker,
              {
                marginTop: -50,
                width: CLAMP_MARKER_WIDTH,
                alignSelf: 'flex-end',
              },
            ]}
          />
        </View>
      </View>
    </>
  );
}

export default function SpringPresetsExample() {
  const [toggle, setToggle] = useState(false);

  const reanimated3DefaultConfigValue = useSharedValue(LOWER_SPRING_TO_VALUE);
  const reanimated3DefaultConfigWithDurationValue = useSharedValue(
    LOWER_SPRING_TO_VALUE
  );
  const gentleConfigValue = useSharedValue(LOWER_SPRING_TO_VALUE);
  const gentleConfigWithDurationValue = useSharedValue(LOWER_SPRING_TO_VALUE);
  const wigglyConfigValue = useSharedValue(LOWER_SPRING_TO_VALUE);
  const wigglyConfigWithDurationValue = useSharedValue(LOWER_SPRING_TO_VALUE);
  const snappyConfigValue = useSharedValue(LOWER_SPRING_TO_VALUE);
  const snappyConfigWithDurationValue = useSharedValue(LOWER_SPRING_TO_VALUE);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <>
        <Visualiser
          sv={reanimated3DefaultConfigValue}
          description="Reanimated 3 default config"
        />
        <Visualiser
          sv={reanimated3DefaultConfigWithDurationValue}
          description="Reanimated 3 default config with duration"
        />
        <Visualiser
          sv={gentleConfigValue}
          description="Gentle spring config (new default)"
        />
        <Visualiser
          sv={gentleConfigWithDurationValue}
          description="Gentle spring config with duration (new default)"
        />
        <Visualiser sv={wigglyConfigValue} description="Wiggly spring config" />
        <Visualiser
          sv={wigglyConfigWithDurationValue}
          description="Wiggly spring config with duration"
        />
        <Visualiser sv={snappyConfigValue} description="Snappy spring config" />
        <Visualiser
          sv={snappyConfigWithDurationValue}
          description="Snappy spring config with duration"
        />
        <Button
          title="toggle"
          onPress={() => {
            reanimated3DefaultConfigValue.value = withSpring(
              toggle ? LOWER_SPRING_TO_VALUE : UPPER_SPRING_TO_VALUE,
              Reanimated3DefaultSpringConfig
            );
            reanimated3DefaultConfigWithDurationValue.value = withSpring(
              toggle ? LOWER_SPRING_TO_VALUE : UPPER_SPRING_TO_VALUE,
              Reanimated3DefaultSpringConfigWithDuration
            );
            gentleConfigValue.value = withSpring(
              toggle ? LOWER_SPRING_TO_VALUE : UPPER_SPRING_TO_VALUE,
              GentleSpringConfig
            );
            gentleConfigWithDurationValue.value = withSpring(
              toggle ? LOWER_SPRING_TO_VALUE : UPPER_SPRING_TO_VALUE,
              GentleSpringConfigWithDuration
            );
            wigglyConfigValue.value = withSpring(
              toggle ? LOWER_SPRING_TO_VALUE : UPPER_SPRING_TO_VALUE,
              WigglySpringConfig
            );
            wigglyConfigWithDurationValue.value = withSpring(
              toggle ? LOWER_SPRING_TO_VALUE : UPPER_SPRING_TO_VALUE,
              WigglySpringConfigWithDuration
            );
            snappyConfigValue.value = withSpring(
              toggle ? LOWER_SPRING_TO_VALUE : UPPER_SPRING_TO_VALUE,
              SnappySpringConfig
            );
            snappyConfigWithDurationValue.value = withSpring(
              toggle ? LOWER_SPRING_TO_VALUE : UPPER_SPRING_TO_VALUE,
              SnappySpringConfigWithDuration
            );
            setToggle(!toggle);
          }}
        />
      </>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: '21.37%',
    flex: 1,
    flexDirection: 'column',
    padding: CLAMP_MARKER_HEIGHT,
    paddingBottom: '21.37%',
  },
  content: {
    alignItems: 'center',
    paddingBottom: 100,
  },
  toValueMarker: {
    position: 'absolute',
    margin: 0,
    opacity: 1,
    zIndex: 100,
    height: CLAMP_MARKER_HEIGHT / 2,
    backgroundColor: VIOLET,
  },
  clampMarker: {
    position: 'absolute',
    margin: 0,
    opacity: 0.5,
    height: 50,
    backgroundColor: VIOLET,
  },
  movingBox: {
    zIndex: 1,
    height: 50,
    opacity: 0.5,
    backgroundColor: 'black',
    width: LOWER_SPRING_TO_VALUE,
    transformOrigin: 'left',
  },
  text: {
    fontSize: 16,
    marginVertical: 4,
    textAlign: 'right',
  },
});

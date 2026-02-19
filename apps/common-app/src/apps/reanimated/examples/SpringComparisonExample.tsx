import React, { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { AnimatedStyle, WithSpringConfig } from 'react-native-reanimated';

const VIOLET = '#b58df1';
const BORDER_WIDTH = 4;
const FRAME_WIDTH = 350;
const CLAMP_MARKER_HEIGHT = 20;
const CLAMP_MARKER_WIDTH = 50;
const CLAMP_MARKER_OFFSET = 20;

const LOWER_SPRING_TO_VALUE = CLAMP_MARKER_WIDTH + CLAMP_MARKER_OFFSET;
const UPPER_SPRING_TO_VALUE =
  FRAME_WIDTH - (CLAMP_MARKER_WIDTH + CLAMP_MARKER_OFFSET);

const RELATIVE_LOWER_SPRING_TO_VALUE = 0;
const RELATIVE_UPPER_SPRING_TO_VALUE = 0.03;
const RELATIVE_COEFFICIENT =
  (UPPER_SPRING_TO_VALUE - LOWER_SPRING_TO_VALUE) /
  (RELATIVE_UPPER_SPRING_TO_VALUE - RELATIVE_LOWER_SPRING_TO_VALUE);

function Visualiser({
  testedStyle,
  description,
}: {
  testedStyle: AnimatedStyle;
  description: string;
}) {
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
        <Animated.View style={[styles.movingBox, testedStyle]} />
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

export default function SpringComparisonExample() {
  const undercriticalConditionsWidth = useSharedValue(LOWER_SPRING_TO_VALUE);
  const [conditionsWidthToggle, setConditionsWidthToggle] = useState(false);

  const undercriticalConditionsWidthWithClamp = useSharedValue(
    LOWER_SPRING_TO_VALUE
  );
  const [
    undercriticalConditionsWidthWithClampToggle,
    setUndercriticalConditionsWidthWithClampToggle,
  ] = useState(false);

  const criticalConditionsWidth = useSharedValue(LOWER_SPRING_TO_VALUE);
  const [criticalConditionsWidthToggle, setCriticalConditionsWidthToggle] =
    useState(false);

  const undercriticalRelativeWidth = useSharedValue(0);
  const [
    undercriticalRelativeWidthToggle,
    setUndercriticalRelativeWidthToggle,
  ] = useState(false);

  const undercriticalRelativeWidthWithClamp = useSharedValue(0);
  const [
    undercriticalRelativeWidthWithClampToggle,
    setUndercriticalRelativeWidthWithClampToggle,
  ] = useState(false);

  const criticalRelativeWidth = useSharedValue(0);
  const [criticalRelativeWidthToggle, setCriticalRelativeWidthToggle] =
    useState(false);

  const criticalConfig: WithSpringConfig = {
    damping: 120,
    mass: 4,
    stiffness: 900,
  };

  const clampConfig: WithSpringConfig = {
    clamp: {
      min: LOWER_SPRING_TO_VALUE - 5,
      max: UPPER_SPRING_TO_VALUE + 5,
    },
  };

  const endConditionsUndercriticalStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleX: undercriticalConditionsWidth.value / LOWER_SPRING_TO_VALUE,
        },
      ],
    };
  });

  const endConditionsUndercriticalWithClampStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleX:
            undercriticalConditionsWidthWithClamp.value / LOWER_SPRING_TO_VALUE,
        },
      ],
    };
  });

  const endConditionsCriticalStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleX: criticalConditionsWidth.value / LOWER_SPRING_TO_VALUE,
        },
      ],
    };
  });

  const endConditionsRelativeUndercriticalStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleX:
            (undercriticalRelativeWidth.value * RELATIVE_COEFFICIENT) /
              LOWER_SPRING_TO_VALUE +
            1,
        },
      ],
    };
  });

  const endConditionsRelativeUndercriticalWithClampStyle = useAnimatedStyle(
    () => {
      return {
        transform: [
          {
            scaleX:
              (undercriticalRelativeWidthWithClamp.value *
                RELATIVE_COEFFICIENT) /
                LOWER_SPRING_TO_VALUE +
              1,
          },
        ],
      };
    }
  );

  const endConditionsRelativeCriticalStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleX:
            (criticalRelativeWidth.value * RELATIVE_COEFFICIENT) /
              LOWER_SPRING_TO_VALUE +
            1,
        },
      ],
    };
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <>
        <Visualiser
          testedStyle={endConditionsUndercriticalStyle}
          description="New end conditions, big value, undercritical (no visual change)"
        />
        <Button
          title="toggle"
          onPress={() => {
            undercriticalConditionsWidth.value = withSpring(
              conditionsWidthToggle
                ? LOWER_SPRING_TO_VALUE
                : UPPER_SPRING_TO_VALUE
            );
            setConditionsWidthToggle(!conditionsWidthToggle);
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={endConditionsUndercriticalWithClampStyle}
          description="New end conditions, big value, undercritical with clamp (no visual change)"
        />
        <Button
          title="toggle"
          onPress={() => {
            undercriticalConditionsWidthWithClamp.value = withSpring(
              undercriticalConditionsWidthWithClampToggle
                ? LOWER_SPRING_TO_VALUE
                : UPPER_SPRING_TO_VALUE,
              clampConfig
            );
            setUndercriticalConditionsWidthWithClampToggle(
              !undercriticalConditionsWidthWithClampToggle
            );
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={endConditionsCriticalStyle}
          description="New end conditions, big value, critical (no visual change)"
        />
        <Button
          title="toggle"
          onPress={() => {
            criticalConditionsWidth.value = withSpring(
              criticalConditionsWidthToggle
                ? LOWER_SPRING_TO_VALUE
                : UPPER_SPRING_TO_VALUE,
              criticalConfig
            );
            setCriticalConditionsWidthToggle(!criticalConditionsWidthToggle);
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={endConditionsRelativeUndercriticalStyle}
          description="Old end conditions, small value, undercritical"
        />
        <Button
          title="toggle"
          onPress={() => {
            undercriticalRelativeWidth.value = withSpring(
              undercriticalRelativeWidthToggle
                ? RELATIVE_LOWER_SPRING_TO_VALUE
                : RELATIVE_UPPER_SPRING_TO_VALUE
            );
            setUndercriticalRelativeWidthToggle(
              !undercriticalRelativeWidthToggle
            );
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={endConditionsRelativeUndercriticalWithClampStyle}
          description="Old end conditions, small value, undercritical with clamp"
        />
        <Button
          title="toggle"
          onPress={() => {
            undercriticalRelativeWidthWithClamp.value = withSpring(
              undercriticalRelativeWidthWithClampToggle
                ? RELATIVE_LOWER_SPRING_TO_VALUE
                : RELATIVE_UPPER_SPRING_TO_VALUE,
              clampConfig
            );
            setUndercriticalRelativeWidthWithClampToggle(
              !undercriticalRelativeWidthWithClampToggle
            );
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={endConditionsRelativeCriticalStyle}
          description="New end conditions, small value, critical"
        />
        <Button
          title="toggle"
          onPress={() => {
            criticalRelativeWidth.value = withSpring(
              criticalRelativeWidthToggle
                ? RELATIVE_LOWER_SPRING_TO_VALUE
                : RELATIVE_UPPER_SPRING_TO_VALUE,
              criticalConfig
            );
            setCriticalRelativeWidthToggle(!criticalRelativeWidthToggle);
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

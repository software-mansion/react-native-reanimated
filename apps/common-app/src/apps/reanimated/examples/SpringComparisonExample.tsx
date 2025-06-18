import React, { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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

const RELATIVE_LOWER_SPRING_TO_VALUE = 0;
const RELATIVE_UPPER_SPRING_TO_VALUE = 0.03;
const RELATIVE_COEFFICIENT =
  (UPPER_SPRING_TO_VALUE - LOWER_SPRING_TO_VALUE) /
  (RELATIVE_UPPER_SPRING_TO_VALUE - RELATIVE_LOWER_SPRING_TO_VALUE);

function Visualiser({
  testedStyle,
  description,
}: {
  testedStyle: ViewStyle;
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
  const configNoTimingWidth = useSharedValue(LOWER_SPRING_TO_VALUE);
  const [configNoTimingWidthToggle, setConfigNoTimingWidthToggle] =
    useState(false);

  const configTimingWidth = useSharedValue(LOWER_SPRING_TO_VALUE);
  const [configTimingWidthToggle, setConfigTimingWidthToggle] = useState(false);

  const undercriticalConditionsWidth = useSharedValue(LOWER_SPRING_TO_VALUE);
  const [conditionsWidthToggle, setConditionsWidthToggle] = useState(false);

  const criticalConditionsWidth = useSharedValue(LOWER_SPRING_TO_VALUE);
  const [cirticalConditionsWidthToggle, setCirticalConditionsWidthToggle] =
    useState(false);

  const oldUndercriticalRelativeWidth = useSharedValue(0);
  const newUndercriticalRelativeWidth = useSharedValue(0);
  const [
    undercriticalRelativeWidthToggle,
    setUndercriticalRelativeWidthToggle,
  ] = useState(false);

  const oldCriticalRelativeWidth = useSharedValue(0);
  const newCriticalRelativeWidth = useSharedValue(0);
  const [criticalRelativeWidthToggle, setCriticalRelativeWidthToggle] =
    useState(false);

  const oldDefaultNoTimingConfig = {
    damping: 10,
    mass: 1,
    stiffness: 100,
  };

  const newDefaultNoTimingConfig = {
    damping: 120,
    mass: 4,
    stiffness: 900,
  };

  const oldDefaultTimingConfig = {
    duration: 2000,
    dampingRatio: 0.5,
  };

  const newDefaultTimingConfig = {
    duration: 800,
    dampingRatio: 1,
  };

  const oldDefaultConfigNoTimingStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(configNoTimingWidth.value, oldDefaultNoTimingConfig),
    };
  });

  const newDefaultConfigNoTimingStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(configNoTimingWidth.value, newDefaultNoTimingConfig),
    };
  });

  const oldDefaultConfigTimingStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(configTimingWidth.value, oldDefaultTimingConfig),
    };
  });

  const newDefaultConfigTimingStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(configTimingWidth.value, newDefaultTimingConfig),
    };
  });

  const oldEndConditionsUndercriticalStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(undercriticalConditionsWidth.value, {
        ...oldDefaultNoTimingConfig,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 2,
      }),
    };
  });

  const newEndConditionsUndercriticalStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(
        undercriticalConditionsWidth.value,
        oldDefaultNoTimingConfig
      ),
    };
  });

  const oldEndConditionsCriticalStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(criticalConditionsWidth.value, {
        ...newDefaultNoTimingConfig,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 2,
      }),
    };
  });

  const newEndConditionsCriticalStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(
        criticalConditionsWidth.value,
        newDefaultNoTimingConfig
      ),
    };
  });

  const oldEndConditionsRelativeUndercriticalStyle = useAnimatedStyle(() => {
    return {
      width:
        oldUndercriticalRelativeWidth.value * RELATIVE_COEFFICIENT +
        LOWER_SPRING_TO_VALUE,
    };
  });

  const newEndConditionsRelativeUndercriticalStyle = useAnimatedStyle(() => {
    return {
      width:
        newUndercriticalRelativeWidth.value * RELATIVE_COEFFICIENT +
        LOWER_SPRING_TO_VALUE,
    };
  });

  const oldConditionsRelativeCriticalStyle = useAnimatedStyle(() => {
    return {
      width:
        oldCriticalRelativeWidth.value * RELATIVE_COEFFICIENT +
        LOWER_SPRING_TO_VALUE,
    };
  });

  const newConditionsRelativeCriticalStyle = useAnimatedStyle(() => {
    return {
      width:
        newCriticalRelativeWidth.value * RELATIVE_COEFFICIENT +
        LOWER_SPRING_TO_VALUE,
    };
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <>
        <Visualiser
          testedStyle={oldDefaultConfigNoTimingStyle}
          description="Old default config, no timing"
        />
        <Visualiser
          testedStyle={newDefaultConfigNoTimingStyle}
          description="New default config, no timing"
        />
        <Button
          title="toggle"
          onPress={() => {
            configNoTimingWidth.value = configNoTimingWidthToggle
              ? LOWER_SPRING_TO_VALUE
              : UPPER_SPRING_TO_VALUE;
            setConfigNoTimingWidthToggle(!configNoTimingWidthToggle);
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={oldDefaultConfigTimingStyle}
          description="Old default config, timing"
        />
        <Visualiser
          testedStyle={newDefaultConfigTimingStyle}
          description="New default config, timing"
        />
        <Button
          title="toggle"
          onPress={() => {
            configTimingWidth.value = configTimingWidthToggle
              ? LOWER_SPRING_TO_VALUE
              : UPPER_SPRING_TO_VALUE;
            setConfigTimingWidthToggle(!configTimingWidthToggle);
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={oldEndConditionsUndercriticalStyle}
          description="Old end conditions, big value, undercritical (no visual change)"
        />
        <Visualiser
          testedStyle={newEndConditionsUndercriticalStyle}
          description="New end conditions, big value, undercritical (no visual change)"
        />
        <Button
          title="toggle"
          onPress={() => {
            undercriticalConditionsWidth.value = conditionsWidthToggle
              ? LOWER_SPRING_TO_VALUE
              : UPPER_SPRING_TO_VALUE;
            setConditionsWidthToggle(!conditionsWidthToggle);
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={oldEndConditionsCriticalStyle}
          description="Old end conditions, big value, critical (no visual change)"
        />
        <Visualiser
          testedStyle={newEndConditionsCriticalStyle}
          description="New end conditions, big value, critical (no visual change)"
        />
        <Button
          title="toggle"
          onPress={() => {
            criticalConditionsWidth.value = cirticalConditionsWidthToggle
              ? LOWER_SPRING_TO_VALUE
              : UPPER_SPRING_TO_VALUE;
            setCirticalConditionsWidthToggle(!cirticalConditionsWidthToggle);
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={oldEndConditionsRelativeUndercriticalStyle}
          description="Old end conditions, small value, undercritical"
        />
        <Visualiser
          testedStyle={newEndConditionsRelativeUndercriticalStyle}
          description="New end conditions, small value, undercritical"
        />
        <Button
          title="toggle"
          onPress={() => {
            oldUndercriticalRelativeWidth.value = withSpring(
              undercriticalRelativeWidthToggle
                ? RELATIVE_LOWER_SPRING_TO_VALUE
                : RELATIVE_UPPER_SPRING_TO_VALUE,
              {
                ...oldDefaultNoTimingConfig,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 2,
              }
            );
            newUndercriticalRelativeWidth.value = withSpring(
              undercriticalRelativeWidthToggle
                ? RELATIVE_LOWER_SPRING_TO_VALUE
                : RELATIVE_UPPER_SPRING_TO_VALUE,
              oldDefaultNoTimingConfig
            );
            setUndercriticalRelativeWidthToggle(
              !undercriticalRelativeWidthToggle
            );
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={oldConditionsRelativeCriticalStyle}
          description="Old end conditions, small value, critical"
        />
        <Visualiser
          testedStyle={newConditionsRelativeCriticalStyle}
          description="New end conditions, small value, critical"
        />
        <Button
          title="toggle"
          onPress={() => {
            oldCriticalRelativeWidth.value = withSpring(
              criticalRelativeWidthToggle
                ? RELATIVE_LOWER_SPRING_TO_VALUE
                : RELATIVE_UPPER_SPRING_TO_VALUE,
              {
                ...newDefaultNoTimingConfig,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 2,
              }
            );
            newCriticalRelativeWidth.value = withSpring(
              criticalRelativeWidthToggle
                ? RELATIVE_LOWER_SPRING_TO_VALUE
                : RELATIVE_UPPER_SPRING_TO_VALUE,

              newDefaultNoTimingConfig
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
  },
  text: {
    fontSize: 16,
    marginVertical: 4,
    textAlign: 'right',
  },
});

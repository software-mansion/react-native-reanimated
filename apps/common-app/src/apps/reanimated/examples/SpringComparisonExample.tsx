import React, { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnUI,
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

  const noVelocityDurationTestWidth200 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const noVelocityDurationTestWidth400 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const noVelocityDurationTestWidth600 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const noVelocityDurationTestWidth800 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const noVelocityDurationTestWidth1000 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const [
    noVelocityDurationTestWidthToggle,
    setNoVelocityDurationTestWidthToggle,
  ] = useState(false);

  const velocityDurationTestWidth6 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth12 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth25 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth50 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth100 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth200 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth400 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth800 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth1600 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth3200 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth6400 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const velocityDurationTestWidth12800 = useSharedValue(LOWER_SPRING_TO_VALUE);
  const [velocityDurationTestWidthToggle, setVelocityDurationTestWidthToggle] =
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

  const noVelocityDurationTestStyle200 = useAnimatedStyle(() => {
    return {
      width: noVelocityDurationTestWidth200.value,
    };
  });

  const noVelocityDurationTestStyle400 = useAnimatedStyle(() => {
    return {
      width: noVelocityDurationTestWidth400.value,
    };
  });

  const noVelocityDurationTestStyle600 = useAnimatedStyle(() => {
    return {
      width: noVelocityDurationTestWidth600.value,
    };
  });

  const noVelocityDurationTestStyle800 = useAnimatedStyle(() => {
    return {
      width: noVelocityDurationTestWidth800.value,
    };
  });

  const noVelocityDurationTestStyle1000 = useAnimatedStyle(() => {
    return {
      width: noVelocityDurationTestWidth1000.value,
    };
  });

  const velocityDurationTestStyle6 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth6.value,
    };
  });

  const velocityDurationTestStyle12 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth12.value,
    };
  });

  const velocityDurationTestStyle25 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth25.value,
    };
  });

  const velocityDurationTestStyle50 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth50.value,
    };
  });

  const velocityDurationTestStyle100 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth100.value,
    };
  });

  const velocityDurationTestStyle200 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth200.value,
    };
  });

  const velocityDurationTestStyle400 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth400.value,
    };
  });

  const velocityDurationTestStyle800 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth800.value,
    };
  });

  const velocityDurationTestStyle1600 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth1600.value,
    };
  });

  const velocityDurationTestStyle3200 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth3200.value,
    };
  });

  const velocityDurationTestStyle6400 = useAnimatedStyle(() => {
    return {
      width: velocityDurationTestWidth6400.value,
    };
  });

  const velocityDurationTestStyle12800 = useAnimatedStyle(() => {
    return {
      width: LOWER_SPRING_TO_VALUE,
      transform: [
        {
          scaleX: velocityDurationTestWidth12800.value / LOWER_SPRING_TO_VALUE,
        },
      ],
      transformOrigin: 'left',
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

      <>
        <Visualiser
          testedStyle={noVelocityDurationTestStyle200}
          description="No velocity, duration 200"
        />
        <Visualiser
          testedStyle={noVelocityDurationTestStyle400}
          description="No velocity, duration 400"
        />
        <Visualiser
          testedStyle={noVelocityDurationTestStyle600}
          description="No velocity, duration 600"
        />
        <Visualiser
          testedStyle={noVelocityDurationTestStyle800}
          description="No velocity, duration 800"
        />
        <Visualiser
          testedStyle={noVelocityDurationTestStyle1000}
          description="No velocity, duration 1000"
        />
        <Button
          title="toggle"
          onPress={() => {
            runOnUI(() => {
              // console.log('start:', performance.now());
              const start = performance.now();

              noVelocityDurationTestWidth200.value = withSpring(
                noVelocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                { duration: 200, dampingRatio: 1 },
                () => console.log('duration 200:', performance.now() - start)
              );
              noVelocityDurationTestWidth400.value = withSpring(
                noVelocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                { duration: 400, dampingRatio: 1 },
                () => console.log('duration 400:', performance.now() - start)
              );
              noVelocityDurationTestWidth600.value = withSpring(
                noVelocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                { duration: 600, dampingRatio: 1 },
                () => console.log('duration 600:', performance.now() - start)
              );
              noVelocityDurationTestWidth800.value = withSpring(
                noVelocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                { duration: 800, dampingRatio: 1 },
                () => console.log('duration 800:', performance.now() - start)
              );
              noVelocityDurationTestWidth1000.value = withSpring(
                noVelocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                { duration: 1000, dampingRatio: 1 },
                () => console.log('duration 1000:', performance.now() - start)
              );
            })();
            setNoVelocityDurationTestWidthToggle(
              !noVelocityDurationTestWidthToggle
            );
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={velocityDurationTestStyle6}
          description="Velocity 6, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle12}
          description="Velocity 12, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle25}
          description="Velocity 25, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle50}
          description="Velocity 50, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle100}
          description="Velocity 100, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle200}
          description="Velocity 200, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle400}
          description="Velocity 400, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle800}
          description="Velocity 800, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle1600}
          description="Velocity 1600, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle3200}
          description="Velocity 3200, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle6400}
          description="Velocity 6400, duration 800"
        />
        <Visualiser
          testedStyle={velocityDurationTestStyle12800}
          description="Velocity 12800, duration 800"
        />

        <Button
          title="toggle"
          onPress={() => {
            runOnUI(() => {
              // console.log('start:', performance.now());
              let start = performance.now();
              velocityDurationTestWidth6.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 6 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 6:', performance.now() - start)
              );
              velocityDurationTestWidth12.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 12 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 12:', performance.now() - start)
              );
              velocityDurationTestWidth25.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 25 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 25:', performance.now() - start)
              );
              velocityDurationTestWidth50.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 50 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 50:', performance.now() - start)
              );
              velocityDurationTestWidth100.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 100 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 100:', performance.now() - start)
              );
              velocityDurationTestWidth200.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 200 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 200:', performance.now() - start)
              );
              velocityDurationTestWidth400.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 400 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 400:', performance.now() - start)
              );
              velocityDurationTestWidth800.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 800 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 800:', performance.now() - start)
              );
              velocityDurationTestWidth1600.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 1600 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 1600:', performance.now() - start)
              );
              velocityDurationTestWidth3200.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 3200 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 3200:', performance.now() - start)
              );
              velocityDurationTestWidth6400.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 6400 * (velocityDurationTestWidthToggle ? 1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 6400:', performance.now() - start)
              );
              velocityDurationTestWidth12800.value = withSpring(
                velocityDurationTestWidthToggle
                  ? LOWER_SPRING_TO_VALUE
                  : UPPER_SPRING_TO_VALUE,
                {
                  duration: 800,
                  velocity: 12800 * (velocityDurationTestWidthToggle ? -1 : 1),
                  dampingRatio: 1,
                },
                () => console.log('velocity 12800:', performance.now() - start)
              );
              start = performance.now();
            })();
            setVelocityDurationTestWidthToggle(
              !velocityDurationTestWidthToggle
            );
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

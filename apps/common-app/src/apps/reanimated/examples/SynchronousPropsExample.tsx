import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Animated, {
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function SynchronousPropsExample() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
  }, [sv]);

  const tenSv = useDerivedValue(() => sv.value * 10, [sv]);

  const fiftySv = useDerivedValue(() => sv.value * 50, [sv]);

  const percentSv = useDerivedValue(() => `${sv.value * 100}%`, [sv]);

  const degSv = useDerivedValue(() => `${sv.value * 45}deg`, [sv]);

  const radSv = useDerivedValue(() => `${(sv.value * Math.PI) / 4}rad`, [sv]);

  const colorSv = useDerivedValue(
    () => interpolateColor(sv.value, [0, 1], ['red', 'blue']),
    [sv]
  );

  const perspectiveSv = useDerivedValue(
    () => Math.pow(2, sv.value * 3 + 4.5),
    [sv]
  );

  const matrixSv = useDerivedValue(
    () => [sv.value * 2, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 10, 1],
    [sv]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <Text style={styles.summary}>
        This example tests all styles and props that can be animated using the
        synchronouslyUpdateViewOnUIThread method when
        ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS static feature flag is enabled.
        Make sure to enable this feature flag for testing. Note that the feature
        flag is Android-only. When the feature flag is disabled on Android (and
        also always on iOS), the updates will be committed to the ShadowTree.
      </Text>

      <Text>opacity</Text>
      <Animated.View
        style={{
          width: 50,
          height: 50,
          backgroundColor: 'navy',
          opacity: sv,
        }}
      />

      <Text>elevation</Text>
      <Animated.View
        style={{
          width: 50,
          height: 50,
          borderWidth: 1,
          elevation: fiftySv,
        }}
      />

      <Text>zIndex</Text>
      <Animated.View
        style={{
          width: 50,
          height: 50,
          borderWidth: 1,
          zIndex: fiftySv,
        }}
      />

      <Text>shadowOpacity (not supported on Android)</Text>
      <Animated.View
        style={{
          width: 50,
          height: 50,
          borderWidth: 1,
          shadowRadius: 2,
          shadowOpacity: sv,
        }}
      />

      <Text>shadowRadius (not supported on Android)</Text>
      <Animated.View
        style={{
          width: 50,
          height: 50,
          borderWidth: 1,
          shadowRadius: tenSv,
          shadowOpacity: 1,
        }}
      />

      <Text>backgroundColor</Text>
      <Animated.View
        style={{
          width: 50,
          height: 50,
          backgroundColor: colorSv,
        }}
      />

      <Text>color</Text>
      <Animated.Text
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: colorSv,
        }}>
        Reanimated
      </Animated.Text>

      <Text>tintColor</Text>
      <Animated.Image
        style={{ width: 50, height: 50, tintColor: colorSv }}
        source={require('./assets/logo.png')}
      />

      {[
        'borderRadius',
        'borderTopLeftRadius',
        'borderTopRightRadius',
        'borderTopStartRadius',
        'borderTopEndRadius',
        'borderBottomLeftRadius',
        'borderBottomRightRadius',
        'borderBottomStartRadius',
        'borderBottomEndRadius',
        'borderStartStartRadius',
        'borderStartEndRadius',
        'borderEndStartRadius',
        'borderEndEndRadius',
      ].map((prop) => (
        <React.Fragment key={prop}>
          <Text>{prop} [px]</Text>
          <Animated.View
            style={{
              width: 50,
              height: 50,
              borderWidth: 1,
              [prop]: fiftySv,
            }}
          />
          <Text>{prop} [%]</Text>
          <Animated.View
            style={{
              width: 50,
              height: 50,
              borderWidth: 1,
              [prop]: percentSv,
            }}
          />
        </React.Fragment>
      ))}

      {[
        'borderColor',
        'borderTopColor',
        'borderBottomColor',
        'borderLeftColor',
        'borderRightColor',
        'borderStartColor',
        'borderEndColor',
      ].map((prop) => (
        <React.Fragment key={prop}>
          <Text>{prop}</Text>
          <Animated.View
            style={{
              width: 50,
              height: 50,
              borderColor: 'lightgray',
              borderWidth: 10,
              [prop]: colorSv,
            }}
          />
        </React.Fragment>
      ))}

      {(['translateX', 'translateY'] as const).map((prop) => (
        <React.Fragment key={prop}>
          <Text>{prop} [px]</Text>
          <Animated.View
            // @ts-expect-error TODO: fix types
            style={{
              width: 50,
              height: 50,
              borderWidth: 1,
              transform: [{ [prop]: fiftySv }],
            }}
          />
          <Text>{prop} [%]</Text>
          <Animated.View
            // @ts-expect-error TODO: fix types
            style={{
              width: 50,
              height: 50,
              borderWidth: 1,
              transform: [{ [prop]: percentSv }],
            }}
          />
        </React.Fragment>
      ))}

      {(['scale', 'scaleX', 'scaleY'] as const).map((prop) => (
        <React.Fragment key={prop}>
          <Text>{prop}</Text>
          <Animated.View
            // @ts-expect-error TODO: fix types
            style={{
              width: 50,
              height: 50,
              borderWidth: 1,
              transform: [{ [prop]: sv }],
            }}
          />
        </React.Fragment>
      ))}

      {(['rotate', 'rotateX', 'rotateY', 'rotateZ'] as const).map((prop) => (
        <React.Fragment key={prop}>
          <Text>{prop} [deg]</Text>
          <Animated.View
            // @ts-expect-error TODO: fix types
            style={{
              width: 50,
              height: 50,
              borderWidth: 1,
              transform: [{ perspective: 250 }, { [prop]: degSv }],
            }}
          />
          <Text>{prop} [rad]</Text>
          <Animated.View
            // @ts-expect-error TODO: fix types
            style={{
              width: 50,
              height: 50,
              borderWidth: 1,
              transform: [{ perspective: 250 }, { [prop]: radSv }],
            }}
          />
        </React.Fragment>
      ))}

      {(['skewX', 'skewY'] as const).map((prop) => (
        <React.Fragment key={prop}>
          <Text>{prop} [deg] (works incorrectly on Android)</Text>
          <Animated.View
            // @ts-expect-error TODO: fix types
            style={{
              width: 50,
              height: 50,
              borderWidth: 1,
              transform: [{ [prop]: degSv }],
            }}
          />
          <Text>{prop} [rad] (works incorrectly on Android)</Text>
          <Animated.View
            // @ts-expect-error TODO: fix types
            style={{
              width: 50,
              height: 50,
              borderWidth: 1,
              transform: [{ [prop]: radSv }],
            }}
          />
        </React.Fragment>
      ))}

      <Text>perspective</Text>
      <Animated.View
        style={{
          width: 50,
          height: 50,
          borderWidth: 1,
          transform: [{ perspective: perspectiveSv }, { rotateY: '45deg' }],
        }}
      />

      <Text>matrix</Text>
      <Animated.View
        style={{
          width: 50,
          height: 50,
          borderWidth: 1,
          transform: [{ matrix: matrixSv }],
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
  },
  summary: {
    padding: 20,
  },
});

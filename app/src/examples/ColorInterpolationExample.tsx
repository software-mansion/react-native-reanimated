import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  isColor,
} from 'react-native-reanimated';
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  Button,
  ScrollView,
} from 'react-native';

import React, { useEffect, useState } from 'react';

function DefaultInterpolation({
  color1,
  color2,
}: {
  color1: string;
  color2: string;
}) {
  const color = useSharedValue(color1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(color.value, { duration: 500 }),
    };
  });

  useEffect(() => {
    color.value = color1;
  }, [color, color1]);

  return (
    <View>
      <Text>Default:</Text>
      <View style={styles.colorContainer}>
        <Animated.View style={[styles.bigbox, animatedStyle]} />
        <Button
          onPress={() => {
            color.value = color2;
          }}
          title="run animation"
        />
      </View>
    </View>
  );
}

function ColorInterpolation({
  interpolateFunction,
  color1,
  color2,
  title,
}: {
  interpolateFunction: (c1: string, c2: string, p: number) => string;
  color1: string;
  color2: string;
  title: string;
}) {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateFunction(color1, color2, progress.value),
    };
  }, [color1, color2]);

  return (
    <View>
      <Text>{title}:</Text>
      <View style={styles.colorContainer}>
        <View style={[styles.box, { backgroundColor: color1 }]} />
        <View style={styles.spacer} />

        {new Array(11)
          .fill(null)
          .map((_, i) => i / 10)
          .map((p) => (
            <View
              key={'' + p}
              style={[
                styles.box,
                { backgroundColor: interpolateFunction(color1, color2, p) },
              ]}
            />
          ))}

        <View style={styles.spacer} />

        <View style={[styles.box, { backgroundColor: color2 }]} />
      </View>
      <View style={styles.colorContainer}>
        <Animated.View style={[styles.bigbox, animatedStyle]} />
        <Button
          onPress={() => {
            progress.value = withTiming(1 - progress.value, { duration: 1000 });
          }}
          title="run animation"
        />
      </View>
    </View>
  );
}

function rgbInterpolation(color1: string, color2: string, progress: number) {
  'worklet';
  return interpolateColor(progress, [0, 1], [color1, color2], 'RGB', {
    gamma: 1,
  });
}

function rgbGammaInterpolation(
  color1: string,
  color2: string,
  progress: number
) {
  'worklet';
  return interpolateColor(progress, [0, 1], [color1, color2]);
}

function hsvInterpolation(color1: string, color2: string, progress: number) {
  'worklet';
  return interpolateColor(progress, [0, 1], [color1, color2], 'HSV', {
    useCorrectedHSVInterpolation: false,
  });
}

function hsvStarInterpolation(
  color1: string,
  color2: string,
  progress: number
) {
  'worklet';
  return interpolateColor(progress, [0, 1], [color1, color2], 'HSV');
}

export default function ColorInterpolationExample() {
  const [color1, setColor1] = useState('#ff0000');
  const [color2, setColor2] = useState('#00ffff');
  const [color1Text, setColor1Text] = useState('#ff0000');
  const [color2Text, setColor2Text] = useState('#00ffff');

  const onChangeColor1 = (color: string) => {
    if (isColor(color)) {
      setColor1(color);
    }
    setColor1Text(color);
  };

  const onChangeColor2 = (color: string) => {
    if (isColor(color)) {
      setColor2(color);
    }
    setColor2Text(color);
  };

  return (
    <ScrollView style={styles.container}>
      <TextInput
        value={color1Text}
        onChangeText={onChangeColor1}
        autoCapitalize="none"
      />
      <TextInput
        value={color2Text}
        onChangeText={onChangeColor2}
        autoCapitalize="none"
      />
      <DefaultInterpolation color1={color1} color2={color2} />
      <ColorInterpolation
        color1={color1}
        color2={color2}
        interpolateFunction={rgbInterpolation}
        title="RGB"
      />
      <ColorInterpolation
        color1={color1}
        color2={color2}
        interpolateFunction={rgbGammaInterpolation}
        title="RGB + gamma correction"
      />
      <ColorInterpolation
        color1={color1}
        color2={color2}
        interpolateFunction={hsvInterpolation}
        title="HSV"
      />
      <ColorInterpolation
        color1={color1}
        color2={color2}
        interpolateFunction={hsvStarInterpolation}
        title="HSV*"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 10,
  },
  colorContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  box: {
    width: 20,
    height: 20,
  },
  bigbox: {
    width: 100,
    height: 100,
  },
  spacer: {
    width: 10,
  },
});

import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  useAnimatedReaction,
  withRepeat,
  withDelay,
  withSequence,
  withSpring,
  withDecay,
} from 'react-native-reanimated';
import { View, Button, ScrollView } from 'react-native';
import React, { useMemo } from 'react';

const indices = Array.from(
  {
    length: 7,
  },
  (v, k) => k
);
const config = {
  duration: 500,
  easing: Easing.bezier(0.5, 0.01, 0, 1),
};

export default function Animations(props) {
  const randomWidths = indices.map((_) => {
    return useSharedValue(10);
  });
  const randomColors = indices.map(() => {
    return useSharedValue('blue');
  });
  const randomToColors = indices.map(() => {
    return useSharedValue('blue');
  });
  const rotations = indices.map(() => {
    return useSharedValue('0deg');
  });
  const colorIndeces = useMemo(() => indices.map(() => 0));
  const colors = useMemo(() => [
    'red',
    'grey',
    'green',
    'white',
    'darkslateblue',
  ]);

  const reactions = useMemo(() => [
    ({ val, color }) => {
      'worklet';
      rotations[0].value = withSequence(
        withTiming(`${val}deg`, config),
        withTiming(`${40}deg`, config)
      );
    },
    ({ val, color }) => {
      'worklet';
      rotations[1].value = withDelay(2000, withTiming(`${val}deg`));
    },
    ({ val, color }) => {
      'worklet';
      rotations[2].value = withRepeat(withTiming(`${val}deg`, config), 2, true);
    },
    ({ val, color }) => {
      'worklet';
      rotations[3].value = withSpring(`${val}deg`);
    },
    ({ val, color }) => {
      'worklet';
      randomColors[4].value = withTiming(color, config);
    },
    ({ val, color }) => {
      'worklet';
      randomColors[5].value = withSpring(color);
    },
    ({ val, color }) => {
      'worklet';
      randomColors[6].value = withDecay({ velocity: 6 });
    },
  ]);

  indices.forEach((i) => {
    const randomWidth = randomWidths[i];
    const toColor = randomToColors[i];
    useAnimatedReaction(() => {
      return { val: randomWidth.value, color: toColor.value };
    }, reactions[i]);
  });

  return (
    <ScrollView
      style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor: 'yellow',
      }}>
      {indices.map((i) => {
        const randomWidth = randomWidths[i];
        const color = randomToColors[i];
        const styleColor = randomColors[i];
        let index = colorIndeces[i];
        const rotation = rotations[i];
        const style = useAnimatedStyle(() => {
          return {
            width: withTiming(randomWidth.value, config),
            backgroundColor: styleColor.value,
            transform: [{ rotate: rotation.value }],
          };
        });
        return (
          <View key={i}>
            <Animated.View
              style={[
                {
                  width: 100,
                  height: 80,
                  margin: 10,
                },
                style,
              ]}
            />
            <Button
              title="toggle"
              onPress={() => {
                randomWidth.value = Math.random() * 350;
                color.value = colors[(++index) % colors.length];
              }}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

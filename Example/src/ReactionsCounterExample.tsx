import Animated, {
  EntryAnimationsValues,
  ExitAnimationsValues,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';

import React from 'react';

const BACKGROUND_COLOR_OFF = '#2F3136';
const BORDER_COLOR_OFF = '#42454A';
const BACKGROUND_COLOR_ON = '#3B405A';
const BORDER_COLOR_ON = '#5865F2';

const COLOR_ANIMATION_DURATION = 80;
const COUNT_ANIMATION_DURATION = 200;
const COUNT_ANIMATION_DELAY = 60;
const COUNT_ANIMATION_DISTANCE = 120;

export function ReactionsCounter(): React.ReactElement {
  const [others, setOthers] = React.useState(3);
  const [you, setYou] = React.useState(false);

  const oldCount = useSharedValue<number | null>(null);
  const newCount = useSharedValue<number | null>(null);

  const emoji = '🚀';
  const count = others + (you ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        you ? BACKGROUND_COLOR_ON : BACKGROUND_COLOR_OFF,
        { duration: COLOR_ANIMATION_DURATION }
      ),
      borderColor: withTiming(you ? BORDER_COLOR_ON : BORDER_COLOR_OFF, {
        duration: COLOR_ANIMATION_DURATION,
      }),
    };
  }, [you]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateCount = (newOthers: number, newYou: boolean) => {
    newCount.value = newOthers + (newYou ? 1 : 0);
    setOthers(newOthers);
    setYou(newYou);
  };

  const toggleYou = () => {
    newCount.value = others + (you ? 0 : 1);
    setYou((y) => !y);
  };

  const entering = (values: EntryAnimationsValues) => {
    'worklet';
    if (oldCount.value === null) {
      // skip entering animation on first render
      oldCount.value = count;
      return { initialValues: {}, animations: {} };
    }
    const offset = (oldCount.value < count ? 1 : -1) * COUNT_ANIMATION_DISTANCE;
    oldCount.value = count;
    const animations = {
      originY: withDelay(
        COUNT_ANIMATION_DELAY,
        withTiming(values.targetOriginY, { duration: COUNT_ANIMATION_DURATION })
      ),
    };
    const initialValues = {
      originY: values.targetOriginY + offset,
    };
    return {
      initialValues,
      animations,
    };
  };

  const exiting = (values: ExitAnimationsValues) => {
    'worklet';
    const offset =
      (count > (newCount.value ?? count) ? 1 : -1) * COUNT_ANIMATION_DISTANCE;
    const animations = {
      originY: withDelay(
        COUNT_ANIMATION_DELAY,
        withTiming(values.currentOriginY + offset, {
          duration: COUNT_ANIMATION_DURATION,
        })
      ),
    };
    const initialValues = {
      originY: values.currentOriginY,
    };
    return {
      initialValues,
      animations,
    };
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={toggleYou}>
        <Animated.View style={[styles.button, animatedStyle]}>
          <View style={styles.contents}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Animated.Text
              key={count}
              style={styles.count}
              entering={entering}
              exiting={exiting}>
              {count}
            </Animated.Text>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#36393F',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    borderWidth: 8,
    borderRadius: 50,
    width: 300,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contents: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 110,
  },
  count: {
    fontSize: 110,
    fontWeight: '500',
    color: '#B9BBBE',
    width: 110,
    textAlign: 'center',
  },
});

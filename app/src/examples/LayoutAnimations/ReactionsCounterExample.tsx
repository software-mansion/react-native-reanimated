import Animated, {
  EntryAnimationsValues,
  ExitAnimationsValues,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import React from 'react';

const BACKGROUND_COLOR_OFF = '#2F3136';
const BORDER_COLOR_OFF = '#42454A';
const BACKGROUND_COLOR_ON = '#3B405A';
const BORDER_COLOR_ON = '#5865F2';

const COLOR_ANIMATION_DURATION = 80;
const COUNT_ANIMATION_DURATION = 200;
const COUNT_ANIMATION_DELAY = 60;
const COUNT_ANIMATION_DISTANCE = 120;

type ReactionsCounterProps = {
  emoji: string;
  count: number;
  you: boolean;
  onPress: () => void;
};

function ReactionsCounter({
  emoji,
  count,
  you,
  onPress,
}: ReactionsCounterProps) {
  const oldCount = useSharedValue<number>(-1);
  const newCount = useSharedValue<number>(count);

  React.useEffect(() => {
    newCount.value = count;
  }, [newCount, count]);

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

  const entering = (values: EntryAnimationsValues) => {
    'worklet';
    if (oldCount.value === -1) {
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
    <TouchableWithoutFeedback onPress={onPress}>
      <Animated.View style={[styles.counter, animatedStyle]}>
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
  );
}

type ButtonProps = {
  onPress: () => void;
  children: string;
};

function Button({ onPress, children }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.button}>
        <Text style={styles.label}>{children}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ReactionsCounterExample() {
  const [others, setOthers] = React.useState(3);
  const [you, setYou] = React.useState(false);

  const toggleYou = () => {
    setYou((y) => !y);
  };

  const incrementOthers = () => {
    setOthers(others + 1);
  };

  const decrementOthers = () => {
    if (others >= 2) {
      setOthers(others - 1);
    }
  };

  const count = others + (you ? 1 : 0);

  return (
    <View style={styles.container}>
      <ReactionsCounter
        emoji="🚀"
        count={count}
        you={you}
        onPress={toggleYou}
      />
      <View style={styles.buttons}>
        <Button onPress={decrementOthers}>&ndash;</Button>
        <View style={styles.hspace} />
        <Button onPress={incrementOthers}>+</Button>
      </View>
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
  counter: {
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
  buttons: {
    marginTop: 30,
    flexDirection: 'row',
  },
  button: {
    width: 80,
    height: 80,
    backgroundColor: '#53575E',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: 'white',
    fontSize: 50,
  },
  hspace: {
    width: 50,
  },
});

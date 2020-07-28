import React, { useState } from 'react';
import { Button, View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useEvent,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

const Child = ({ expanded }) => {
  const uas = useAnimatedStyle(() => {
    return {
      width: expanded ? 10 : 300,
    };
  }, [expanded]);
  return (
    <View>
      <Animated.View style={[styles.box, uas]} />
    </View>
  );
};

const FastRefreshTest = () => {
  const [state, setState] = useState(-1);
  const [expanded, setExpanded] = useState(true);

  const shared = useSharedValue(state);

  // test useDerivedValue
  const derived = useDerivedValue(() => {
    return state;
  }, [state]);

  const derivedNotListening = useDerivedValue(() => {
    return state;
  });

  // test useAnimatedStyle
  const uasShared = useAnimatedStyle(() => {
    return {
      width: shared.value,
    };
  });

  const uasListening = useAnimatedStyle(() => {
    return {
      width: state,
    };
  }, [state]);

  const uasNotListening = useAnimatedStyle(() => {
    return {
      width: state,
    };
  });

  const update = () => {
    setState(Math.floor(Math.random() * 300));
    setExpanded(!expanded);
  };

  if (shared.value === -1) {
    update();
  }

  // test useEvent
  const flag = useSharedValue(1);
  const eventHandler = useEvent(
    event => {
      if (flag.value === 1) {
        setState(Math.floor(Math.random() * 300));
        flag.value = 0;
        setTimeout(() => {
          flag.value = 1;
        }, 100);
      }
    },
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent']
  );

  const bgColor =
    state === derived.value &&
    state === shared.value &&
    state !== derivedNotListening.value
      ? 'green'
      : 'red';

  return (
    <View>
      <Button title="change state" onPress={update} />
      <Text style={{ padding: 10, backgroundColor: bgColor }}>
        Those should be the same: {state}/{derived.value}/{shared.value} but not
        this one: {derivedNotListening.value}
      </Text>
      <Text>The lengths of the following containers should be the same</Text>
      <Animated.View style={[styles.box, uasShared]} />
      <Animated.View style={[styles.box, uasListening]} />
      <Text>This should alternate(long/short)</Text>
      <Child expanded={expanded} />
      <Text>But this should not update</Text>
      <Animated.View style={[styles.box, uasNotListening]} />
      <Text>Event test, try to drag the box below to trigger changes</Text>
      <PanGestureHandler onGestureEvent={eventHandler}>
        <Animated.View
          style={[{ backgroundColor: 'green', width: 100, height: 100 }]}
        />
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    backgroundColor: 'orange',
    margin: 10,
  },
});

export default FastRefreshTest;

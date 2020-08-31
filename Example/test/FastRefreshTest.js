import React, { useState } from 'react';
import { Button, View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { TapGestureHandler } from 'react-native-gesture-handler';

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
  const testResult = useSharedValue(0);

  const derived = useDerivedValue(() => {
    return state;
  });

  const resultUas = useAnimatedStyle(() => {
    const color = testResult.value === 1 ? 'green' : 'red';
    return {
      backgroundColor: color,
    };
  });

  // test useAnimatedStyle
  const uasShared = useAnimatedStyle(() => {
    return {
      width: shared.value,
    };
  });

  const uasListeningOne = useAnimatedStyle(() => {
    return {
      width: state,
    };
  }, [state]);

  const uasListeningAll = useAnimatedStyle(() => {
    return {
      width: state,
    };
  });

  const uasNotListening = useAnimatedStyle(() => {
    return {
      width: state,
    };
  }, []);

  const update = () => {
    testResult.value = 0;
    setState(Math.floor(Math.random() * 300));
    setExpanded(!expanded);
  };

  // sometimes we have to wait for shared value to be set and then read properly
  const waitingTimeout = 100;
  const startCounting = Date.now();
  while (state !== shared.value) {
    const delay = Date.now() - startCounting;
    if (delay > waitingTimeout) {
      console.log('timeout exceeded waiting for shared value: ' + delay);
      break;
    }
  }

  // test gestures
  const ghsv1 = useSharedValue(0);
  const ghsv2 = useSharedValue(0);
  const ghsv3 = useSharedValue(0);

  const ghas1 = useAnimatedStyle(() => {
    return {
      backgroundColor: ghsv1.value === state ? 'green' : 'red',
    };
  });

  const ghas2 = useAnimatedStyle(() => {
    return {
      backgroundColor: ghsv2.value === state ? 'green' : 'red',
    };
  });

  const ghas3 = useAnimatedStyle(() => {
    return {
      backgroundColor: ghsv3.value === state ? 'green' : 'red',
    };
  });

  // not passing dependencies - obtaining dependencies from closure
  const tapEventHandler = useAnimatedGestureHandler({
    onEnd: (_) => {
      ghsv1.value = state;
    },
  });

  // passing state as dependency
  const tapEventHandlerListenToOne = useAnimatedGestureHandler(
    {
      onEnd: (_) => {
        ghsv2.value = state;
      },
    },
    [state]
  );

  // empty array of dependencies
  const tapEventHandlerNotListening = useAnimatedGestureHandler(
    {
      onEnd: (_) => {
        ghsv3.value = state;
      },
    },
    []
  );

  return (
    <View>
      <Text>Press the button to do testing</Text>
      <Button title="change state" onPress={update} />
      <Button
        title="check derived values"
        onPress={() => {
          if (derived.value === state) {
            testResult.value = 1;
          } else {
            testResult.value = 0;
          }
        }}
      />
      <Text>This box should be green after pressing checking button</Text>
      <Animated.View
        style={[{ width: 100, height: 20, backgroundColor: 'gray' }, resultUas]}
      />
      <Text>The lengths of the following containers should be the same</Text>
      <Animated.View style={[styles.box, uasShared]} />
      <Animated.View style={[styles.box, uasListeningOne]} />
      <Animated.View style={[styles.box, uasListeningAll]} />
      <Text>This should alternate(long/short) on button press</Text>
      <Child expanded={expanded} />
      <Text>But this should not update</Text>
      <Animated.View style={[styles.box, uasNotListening]} />

      <Text>Testing events:</Text>
      <Text>
        Following boxes should turn green when pressed(after pressing the button
        on the top)
      </Text>
      <TapGestureHandler onGestureEvent={tapEventHandler}>
        <Animated.View
          style={[{ height: 25, width: 25, backgroundColor: 'red' }, ghas1]}
        />
      </TapGestureHandler>

      <TapGestureHandler onGestureEvent={tapEventHandlerListenToOne}>
        <Animated.View
          style={[{ height: 25, width: 25, backgroundColor: 'red' }, ghas2]}
        />
      </TapGestureHandler>

      <Text>This one should stay red</Text>

      <TapGestureHandler onGestureEvent={tapEventHandlerNotListening}>
        <Animated.View
          style={[{ height: 25, width: 25, backgroundColor: 'red' }, ghas3]}
        />
      </TapGestureHandler>
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

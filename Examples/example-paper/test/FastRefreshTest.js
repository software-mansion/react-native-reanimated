import React, { useState } from 'react';
import { Button, View, StyleSheet, Text, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedGestureHandler,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { TapGestureHandler } from 'react-native-gesture-handler';

const UASChild = ({ expanded }) => {
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

const TestUASCase = ({ state, dependencies }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: state,
    };
  }, dependencies);

  return <Animated.View style={[styles.box, animatedStyle]} />;
};

const TestUAS = ({ expanded, state }) => {
  const shared = useSharedValue(state);

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

  return (
    <>
      <Text>The lengths of those containers should be equal</Text>
      <TestUASCase state={state} dependencies={undefined} />
      <TestUASCase state={state} dependencies={[state]} />
      <Text>This should alternate(long/short) on button press</Text>
      <UASChild expanded={expanded} />
      <Text>But this should not update</Text>
      <TestUASCase state={state} dependencies={[]} />
    </>
  );
};

const TestUDVCase = ({ state, dependencies }) => {
  const derived = useDerivedValue(() => {
    return state;
  }, dependencies);

  const animatedStyle = useAnimatedStyle(() => {
    const color = state !== -1 && derived.value === state ? 'green' : 'red';
    return {
      backgroundColor: color,
    };
  });
  return <Animated.View style={[styles.box, animatedStyle]} />;
};

const TestUDV = ({ state, UDVTestResult }) => {
  return (
    <>
      <Text>Those boxes should be green after pressing checking button</Text>
      <TestUDVCase state={state} dependencies={undefined} />
      <TestUDVCase state={state} dependencies={[state]} />
      <Text>This one should remain red</Text>
      <TestUDVCase state={state} dependencies={[]} />
    </>
  );
};

const TestUAGHCase = ({ state, dependencies }) => {
  const sv = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: sv.value === state ? 'green' : 'red',
    };
  });

  const tapEventHandler = useAnimatedGestureHandler(
    {
      onEnd: (_) => {
        sv.value = state;
      },
    },
    dependencies
  );

  return (
    <TapGestureHandler onGestureEvent={tapEventHandler}>
      <Animated.View
        style={[
          { height: 25, width: 25, backgroundColor: 'red' },
          animatedStyle,
        ]}
      />
    </TapGestureHandler>
  );
};

const TestUAGH = ({ state }) => {
  return (
    <>
      <Text>Testing events:</Text>
      <Text>
        Following boxes should turn green when pressed(after pressing the button
        on the top)
      </Text>
      <TestUAGHCase state={state} dependencies={undefined} />
      <TestUAGHCase state={state} dependencies={[state]} />
      <Text>This one should stay red</Text>
      <TestUAGHCase state={state} dependencies={[]} />
    </>
  );
};
let cid = 0;
const TestUASHCase = ({ itemsArr, state, dependencies }) => {
  const sv = useSharedValue(-1);
  const id = ++cid;

  const scrollHandler = useAnimatedScrollHandler(
    {
      onEndDrag: (e) => {
        sv.value = state;
      },
    },
    dependencies
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: state !== -1 && state === sv.value ? 'green' : 'red',
    };
  });

  return (
    <>
      <Animated.View style={[styles.box, animatedStyle]} />
      <Animated.ScrollView
        style={{ backgroundColor: 'yellow', margin: 5 }}
        scrollEventThrottle={1}
        horizontal={true}
        onScroll={scrollHandler}>
        {itemsArr.map((i) => {
          return (
            <View
              style={{
                width: 25,
                height: 25,
                backgroundColor: i % 2 ? 'black' : 'yellow',
              }}
              key={`${id}-${i}`}
            />
          );
        })}
      </Animated.ScrollView>
    </>
  );
};

const TestUASH = ({ state }) => {
  const itemsArr = [];
  for (let i = 0; i < 15; ++i) {
    itemsArr.push(i);
  }

  return (
    <>
      <Text>After scroll checking containers should turn green</Text>
      <TestUASHCase
        state={state}
        itemsArr={itemsArr}
        dependencies={undefined}
      />
      <TestUASHCase state={state} itemsArr={itemsArr} dependencies={[state]} />
      <Text>Here it should stay red</Text>
      <TestUASHCase state={state} itemsArr={itemsArr} dependencies={[]} />
    </>
  );
};

const FastRefreshTest = () => {
  const [state, setState] = useState(-1);
  const [expanded, setExpanded] = useState(true);

  const UDVTestResult = useSharedValue(0);

  const update = () => {
    UDVTestResult.value = 0;
    setState(Math.floor(Math.random() * 300));
    setExpanded(!expanded);
  };

  return (
    <ScrollView>
      <Text>Press the button to do testing</Text>
      <Button title="change state" onPress={update} />
      <TestUDV state={state} UDVTestResult={UDVTestResult} />
      <TestUAS expanded={expanded} state={state} />
      <TestUAGH state={state} />
      <TestUASH state={state} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  box: {
    width: 10,
    height: 10,
    backgroundColor: 'orange',
    margin: 5,
  },
});

export default FastRefreshTest;

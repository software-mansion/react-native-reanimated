import React from 'react';
import { View, Dimensions, TouchableHighlight, Text } from "react-native"
import Animated, { useSharedValue, useEventWorklet, Worklet, useWorklet, useSpring } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useAnimatedStyle } from '../../src/reanimated2/Hooks';

const toggleWorklet = new Worklet(
  function(x, target, parentWidth, spring) {
    'worklet';
    if (target.value < 100)
    {
      target.set(parentWidth.value - 60);
    } else {
      target.set(20);
    }
    this.log("ustawiam target na: " + target.value.toString()); 
    x.set(Reanimated.withWorklet(spring.worklet, [{}, {toValue: target}]));
    return true;
  }
);

function WithWorkletScreen() {
  const parentWidth = useSharedValue(100);
  const targetX = useSharedValue(20);

  const spring = useSpring({},{});

  const style = useAnimatedStyle(
    function(input, accessories) {
      'worklet';
      const { targetX } = input;
      const { spring } = accessories;
      return {
        position: 'absolute',
        width: 40,
        height: 40,
        transform: [{
          translateX: Reanimated.withWorklet(spring.worklet, [{}, {toValue: targetX}], 20),
        },
        {
          translateY: 200
        }],
      }
    }, { targetX }, { spring }
  );

  const toggle = useWorklet(toggleWorklet, [style.transform[0].translateX, targetX, parentWidth, spring]);

  const eventWorklet = useEventWorklet(
    function(x, spring, target) {
      'worklet';
      x.set(this.event.absoluteX);

      if (this.event.state === Reanimated.END) {
        x.set(Reanimated.withWorklet(spring.worklet, [{velocity: this.event.velocityX}, {toValue: target}]));
      }
    }, [style.transform[0].translateX, spring, targetX]
  );

  return (
    <View style={{ flex: 1 }} onLayout={(e) => { parentWidth.set(e.nativeEvent.layout.width); }}>
      <PanGestureHandler
        onGestureEvent={eventWorklet}
        onHandlerStateChange={eventWorklet}
      >
        <Animated.View
          style={[
            style, 
            {backgroundColor: 'black'},
          ]}
        />
      </PanGestureHandler>
      <TouchableHighlight style={{ backgroundColor: 'black', margin: 10, padding:10  }} onPress={async (e) => {
        toggle();
      }}>
        <Text style={{ color: 'white',  }}>  toogle </Text>
      </TouchableHighlight>
    </View>
  )
}

export default WithWorkletScreen;
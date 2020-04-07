import React from 'react';
import { View, Dimensions, TouchableHighlight, Text } from "react-native"
import Animated, { useSharedValue, useEventWorklet, Worklet, useWorklet } from 'react-native-reanimated';
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
    x.set(Reanimated.withWorklet(spring, [target, 0]));
    return true;
  }
);

const springWorklet = new Worklet( 
  function (sv, target, velocity, mass) { //ToDo
    'worklet';
    this.log(velocity.value);
    const delta = target.value - sv.value;
    if (Math.abs(delta) < 0.2) {
      sv.forceSet(target.value);
      return true;
    } else {
      velocity.set(velocity.value + Math.sign(delta) * 0.9);
      velocity.set(velocity.value * 0.93);
      if (Math.sign(velocity.value) * Math.sign(delta) === -1) {
        velocity.set(velocity.value * (Math.min(Math.abs(delta), 100)/100));
      }
      
      sv.forceSet(sv.value + velocity.value);
    }
  }
);

function WithWorkletScreen() {
  const parentWidth = useSharedValue(100);
  const targetX = useSharedValue(20);

  const spring = useWorklet( 
    springWorklet
    ,[0, targetX, 0, 1]
  );

  const style = useAnimatedStyle(
    function(input) {
      'worklet';
      const {targetX, spring} = input;
      return {
        position: 'absolute',
        width: 40,
        height: 40,
        transform: [{
          translateX: Reanimated.withWorklet(spring, [targetX], 20),
        },
        {
          translateY: 200
        }],
      }
    }, {targetX, spring}
  );

  const toggle = useWorklet(toggleWorklet, [style.transform[0].translateX, targetX, parentWidth, spring]);

  const eventWorklet = useEventWorklet(
    function(x, spring, target) {
      'worklet';
      x.set(this.event.absoluteX);

      if (this.event.state === Reanimated.END) {
        x.set(Reanimated.withWorklet(spring, [target, this.event.velocityX]));
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
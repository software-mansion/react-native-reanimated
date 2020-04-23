import React from 'react';
import { View, Dimensions, TouchableHighlight, Text } from "react-native"
import Animated, { useSharedValue, useEventWorklet, Worklet, useWorklet, useSpring, useAnimatedStyle } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

const toggleWorklet = new Worklet(
  function(x, parentWidth, spring) {
    'worklet';
    console.log('jestem');
    let target = spring.config.toValue.value;
    if (target < 100)
    {
      target = parentWidth.value - 60;
    } else {
      target = 20;
    }
    console.log("new target: " + target.toString()); 
    x.set(Reanimated.withWorklet(spring.worklet, [{}, {toValue: target}]));
    return true;
  }
);

function WithWorkletScreen() {
  const parentWidth = useSharedValue(100);

  const spring = useSpring({},{});

  const style = useAnimatedStyle(
    function(input, accessories) {
      'worklet';
      const { spring } = accessories;
      return {
        position: 'absolute',
        width: 40,
        height: 40,
        transform: [{
          translateX: Reanimated.withWorklet(spring.worklet, [{}, {toValue: 20}], 0),
        },
        {
          translateY: 200
        }],
      }
    }, {  }, { spring }
  );

  const toggle = useWorklet(toggleWorklet, [style.transform[0].translateX, parentWidth, spring]);

  const eventWorklet = useEventWorklet(
    function(x, spring) {
      'worklet';
      x.set(this.event.absoluteX);

      if (this.event.state === Reanimated.END) {
        x.set(Reanimated.withWorklet(spring.worklet, [{velocity: this.event.velocityX}]));
      }
    }, [style.transform[0].translateX, spring]
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
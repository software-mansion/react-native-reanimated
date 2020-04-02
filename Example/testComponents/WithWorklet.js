import React from 'react';
import { View, Dimensions, TouchableHighlight } from "react-native"
import Animated, { useSharedValue, useEventWorklet } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useAnimatedStyle } from '../../src/reanimated2/Hooks';
import { isNumberTypeAnnotation } from '@babel/types';

function WithWorklet() {

const transX = useAnimatedStyle( function (input) {
  'worklet';
 
  const spring = useWorklet(); //todo

  const targetX = useSharedValue(100);

  const style = useAnimatedStyle(
    function(input) {
      'worklet';
      const {targetX, spring} = input;
      return {
        position: 'absolute',
        width: 40,
        height: 40,
        transform: [{
          translateX: Animated.withWorklet(spring, [targetX]),
        },
        {
          translateY: 100
        }],
      }
    }, {targetX, spring}
  );

  const eventWorklet = useEventWorklet(
    function(x, spring) {
      'worklet';
      
      if (this.event.state === Animated.START) {
        x.set(this.event.translateX);
      } 

      if (this.event.state === Animated.END) {
        x.set(Animated.withWorklet(spring, [this.event.velocityX]));
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
      <TouchableHighlight style={{ backgroundColor: 'black', margin: 10 }} onPress={async (e) => {
        //ToDo change targetX
      }}>
        <Text style={{ color: 'white' }} toogle ></Text>
      </TouchableHighlight>
    </View>
  )
}

export default WithWorklet
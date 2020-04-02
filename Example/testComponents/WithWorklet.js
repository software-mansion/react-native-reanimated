import React from 'react';
import { View, Dimensions, TouchableHighlight } from "react-native"
import Animated, { useSharedValue, useEventWorklet } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useAnimatedStyle } from '../../src/reanimated2/Hooks';
import { isNumberTypeAnnotation } from '@babel/types';

function WithWorklet() {

const transX = useAnimatedStyle( function (input) {
  'worklet';
 
  const spring = useWorklet();

  const style = useAnimatedStyle(
    function(input) {
      'worklet';
      return {
        position: 'absolute',
            width: 40,
            height: 40,
            transform: [{
              translateX: Animated.withWorklet
            },
            {
              translateY: 100
            }],
      }
    }
  );

  return (
    <View style={{ flex: 1 }} onLayout={(e) => { parentWidth.set(e.nativeEvent.layout.width); }}>
      <PanGestureHandler
        onGestureEvent={eventWorklet}
        onHandlerStateChange={eventWorklet}
      >
        <Animated.View
          style={{
            
            backgroundColor: 'black',
          }}
        />
      </PanGestureHandler>
      <TouchableHighlight style={{ backgroundColor: 'black', margin: 10 }} onPress={async (e) => {
        
      }}>
        <Text style={{ color: 'white' }} toogle ></Text>
      </TouchableHighlight>
    </View>
  )
}

export default WithWorklet
import React from 'react';
import { View, Dimensions, TouchableHighlight } from "react-native"
import Animated, { useSharedValue, useEventWorklet } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useAnimatedStyle } from '../../src/reanimated2/Hooks';
import { isNumberTypeAnnotation } from '@babel/types';

function WithWorklet() {

const transX = useAnimatedStyle( function (input) {
  'worklet';
 
  const use

  const interpolation = useWorklet(
    function(sv, speedCoef, beginTime) {
      'worklet';
    },
   [0, 1, 0]); // obj/ sharedArray doesn't matter

  const holder = useSharedValue(0);
  const cosTam = useSharedValue("sth");

  const animatedValue = useSharedValue(0);

  const eventWorkelt = useEventWorklet(
    function(cosTam, holder, worklet, animatedValue) {
      holder.start(worklet, 5, costam);
      holder.stop();
      
      animatedValue.startUpdater(worklet, costam);
      animatedValue.freeze();
      animatedValue.set(6);
    }, [cosTam, holder, worklet, animatedValue]);

  return (
    <View style={{ flex: 1 }} onLayout={(e) => { parentWidth.set(e.nativeEvent.layout.width); }}>
      <PanGestureHandler
        onGestureEvent={eventWorklet}
        onHandlerStateChange={eventWorklet}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: 40,
            height: 40,
            transform: [{
              translateX: translateX
            },
            {
              translateY: 100
            }],
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
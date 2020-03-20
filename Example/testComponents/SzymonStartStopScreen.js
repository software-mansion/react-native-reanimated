import Animated, { useSharedValue, useWorklet, useEventWorklet, Worklet } from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React, { useState, useRef } from 'react';

export default function RotatingSquare(props) {
  const rotation = useSharedValue('0deg');
  const deg = useSharedValue(0);
  const startTime = useSharedValue(0);
  const isWorking = useRef(false);
  

  const rotationWorklet = useWorklet(function(startTime, deg, rotation) {
    'worklet';
    if (startTime.value === 0) {
      startTime.set(Date.now());
    }

    const duration = 5000;
    const timeSinceStart = (Date.now() - startTime.value) % duration;
    deg.set((timeSinceStart / duration * 360 + deg.value) % 360);
    rotation.set(deg.value.toString() + 'deg');

  }, [startTime, deg, rotation]);

  return (
    <View style={{ flex:1, borderColor:'black', borderWidth:2, flexDirection: 'column' }}>
      <Button title='toggle' onPress={ () => { 
        if (isWorking.current) {
          rotationWorklet.stop();
          startTime.set(0);
        } else {
          rotationWorklet.start();
        }
        isWorking.current = !isWorking.current;
       }} />
      <Animated.View
        style={{
          width: 40,
          height: 40,
          backgroundColor: 'black',
          margin: 100,
          transform: [{ rotate: rotation}],
        }}
      />
    </View>
  );
}
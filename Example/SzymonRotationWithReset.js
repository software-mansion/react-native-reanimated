import Animated, { useSharedValue, useWorklet, useEventWorklet, Worklet } from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React, { useState, useEffect } from 'react';

function RotatingSquare(props) {
  console.log('render RotatingSquare');
  const rotation = useSharedValue('0deg');
  const startTime = useSharedValue(0);

  const rotationWorklet = useWorklet(function(startTime, rotation) {
    'worklet';
    const now = Date.now();
    if (startTime.value === 0) {
      startTime.set(now);
    }

    const duration = 15000;
    const timeSinceStart = (now - startTime.value) % duration;
    const deg = timeSinceStart / duration * 360;
    rotation.set(deg.toString() + 'deg');
  }, [startTime, rotation]);

  rotationWorklet.stop();
  startTime.set(0); 
  rotationWorklet.start();

  console.log("color: " + props.squareColor);

  return (
    <View style={{ flex:1, borderColor:'black', borderWidth:2 }}>
      <Animated.View
        style={{
          width: 40,
          height: 40,
          backgroundColor: props.squareColor,
          margin: 100,
          transform: [{ rotate: rotation}],
        }}
      />
    </View>
  );
}

export default function RotatingScreen() {
  console.log('render RotatingScreen');
  const colors = ['black', 'red', 'blue'];
  const [squareColor, setSquareColor] = useState('black');
  const [colorIndex, setColorIndex] = useState(0);

  return (
    <View style={{flex:1, flexDirection:'column'}} >
      <Button title='changeColor' onPress={ () => { 
        const nextIndex = (colorIndex + 1) % colors.length;
        setColorIndex(nextIndex);
        setSquareColor(colors[nextIndex]);
       }} />
       <RotatingSquare squareColor={squareColor} />
    </View>
  );
}
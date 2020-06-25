import React, { useState } from 'react';
import {
  View,
  Button,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedStyleMultipleViews = () => {
    const [x, setX] = useState(0)
    const offset = useSharedValue(0)
  
    console.log(x)
    const opacityAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            translateX: withSpring(offset.value),
          }
        ],
      };
    });
    const style = [{height: 20, width: 20}, opacityAnimatedStyle]
    return (
      <View>
        <Button onPress={ () => {
          offset.value = offset.value + 10
        } } title="change style" />
        <Button onPress={ () => {
          setX(x+1)
        } } title="rerender" />
        <Animated.View style={ style.concat({backgroundColor: 'red'}) } />
        <Animated.View style={ style.concat({backgroundColor: 'blue'}) } />
        <Animated.View style={ style.concat({backgroundColor: 'green'}) } />
        <Animated.View style={ style.concat({backgroundColor: 'yellow'}) } />
        <Animated.View style={ style.concat({backgroundColor: 'black'}) } />
      </View>
    )
}

export default AnimatedStyleMultipleViews;

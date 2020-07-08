import React from 'react';
import { TextInput, Button } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  useDerivedValue,
  withSpring,
  useMapper,
  useEvent,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useAnimatedProps, withTiming } from '../../src/Animated';

const SimpleTest = () => {
    // check if certain hooks work
    const sv = useSharedValue(50)

    const mapper = useMapper(() => {
      'worklet'
      console.log(`sv has been updated to ${ sv.value }`)
    }, [sv])
    
    const event = useEvent((event) => {
      'worklet'
      console.log(`event triggered ${ event }`)
    }, ['onGestureHandlerStateChange', 'onGestureHandlerEvent'])


    const derived = useDerivedValue(() => {
      return sv.value * 2
    })

    const uas = useAnimatedStyle(() => {
      return {
        width: sv.value * 2,
        height: sv.value,
      }
    })

    const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
    const props = useAnimatedProps(() => {
      return {
        value: 'animated props works ' + sv.value,
      }
    })
    // useAnimatedGestureHandler
    // useAnimatedScrollHandler

    return (
        <Animated.View>
          <AnimatedTextInput animatedProps={props} style={ { padding: 10 } } />
          <Button title="change size(raw)" onPress={ () => { sv.value = Math.floor(Math.random()*100+50) } } />
          <Button title="change size(with Timing)" onPress={ () => { sv.value = withTiming(Math.floor(Math.random()*100+50)) } } />
          <Button title="change size(with Spring)" onPress={ () => { sv.value = withSpring(Math.floor(Math.random()*100+50)) } } />
          <Animated.View style={ [{ backgroundColor: 'green', }, uas] } />
        </Animated.View>
    );
}

export default SimpleTest;

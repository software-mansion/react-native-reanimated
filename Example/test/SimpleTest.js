import React from 'react';
import { TextInput, Button, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  useMapper,
  useEvent,
  useAnimatedProps,
  withTiming,
  useAnimatedGestureHandler,
  useAnimatedScrollHandler,
  withDecay,
  delay,
  loop,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

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

    const gestureHandler = useAnimatedGestureHandler({
      onStart: (event, context) => {
        console.log('event started')
      },
      onActive: (event, context) => {
        console.log('event active')
      },
      onEnd: (event, context) => {
        console.log('event end')
      },
      onFail: (event, context) => {
        console.log('event fail')
      },
      onCancel: (event, context) => {
        console.log('event cancel')
      },
      onFinish: (event, context, isFinished) => {
        console.log('event finish')
      },
    })

    
    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
        console.log('scroll on scroll')
      },
      onBeginDrag: (e) => {
        console.log('scroll being drag')
      },
      onEndDrag: (e) => {
        console.log('scroll drag end')
      },
      onMomentumBegin: (e) => {
        console.log('scroll momentum begin')
      },
      onMomentumEnd: (e) => {
        console.log('scroll momentum end')
      },
    });

    const updateSV = () => {
      return Math.floor(Math.random()*100+50);
    }

    return (
        <Animated.View>
          <AnimatedTextInput animatedProps={props} style={ { padding: 10 } } />
          <Button title="change size(raw)" onPress={ () => { sv.value = updateSV() } } />
          <Button title="change size(with timing)" onPress={ () => { sv.value = withTiming(updateSV()) } } />
          <Button title="change size(with spring)" onPress={ () => { sv.value = withSpring(updateSV()) } } />
          <Button title="change size(with decay)" onPress={ () => { sv.value = withDecay({
          velocity: Math.floor(Math.random()*100-50),
        }); } } />
          <Button title="change size(delay)" onPress={ () => { sv.value = delay(1000, withTiming(updateSV(), { duration: 0 })) } } />
          <Button title="change size(loop)" onPress={ () => { sv.value = loop(withTiming(updateSV(), { duration: 500 })) } } />
          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={ [{ backgroundColor: 'green', }, uas] } />
          </PanGestureHandler>

          <Animated.ScrollView
              style={ { backgroundColor: 'yellow' } }
              scrollEventThrottle={1}
              onScroll={scrollHandler}>
            <View style={ { width: 25, height: 25, backgroundColor: 'black', } } />
            <View style={ { width: 25, height: 25, backgroundColor: 'black', } } />
            <View style={ { width: 25, height: 25, backgroundColor: 'black', } } />
            <View style={ { width: 25, height: 25, backgroundColor: 'black', } } />
            <View style={ { width: 25, height: 25, backgroundColor: 'black', } } />
          </Animated.ScrollView>
        </Animated.View>
    );
}

export default SimpleTest;

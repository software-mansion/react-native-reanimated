import React, { useState } from 'react';
import {
  View,
  Button,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

// horizontal line separator

const HR = () => {
    return (
        <View
        style={{
                borderBottomColor: 'black',
                borderBottomWidth: 1,
                marginTop: 30,
                marginBottom: 30,
            }}
        />)
}

// TEST 1

const Test1 = () => {
    const offset = useSharedValue(0)
    const [visible, setVisible] = useState(true)
    const labels = ['show elements', 'hide elements']
    let label = labels[+visible]
  
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

    const renderElementsConditionaly = () => {
        if (!visible) {
            return <></>
        }
        return (
            <>
                <Animated.View style={ style.concat({backgroundColor: 'red'}) } />
                <Animated.View style={ style.concat({backgroundColor: 'blue'}) } />
                <Animated.View style={ style.concat({backgroundColor: 'green'}) } />
                <Animated.View style={ style.concat({backgroundColor: 'yellow'}) } />
                <Animated.View style={ style.concat({backgroundColor: 'black'}) } />
            </>
        )
    }
    
    return (
      <View>
        <Button onPress={ () => {
          offset.value = offset.value + 10
        } } title="move" />
        <Button onPress={ () => {
            setVisible(!visible)
            label = labels[+visible]
        } } title={ label } />
        { renderElementsConditionaly() }
      </View>
    )
}

// TEST 2

const Test2 = () => {
    const x = useSharedValue(0)
    const y = useSharedValue(0)
    const dropx = useSharedValue(0)
    const dropy = useSharedValue(0)

    const animatedStyle = useAnimatedStyle(() => {
        return {
          transform: [
            { translateX: x.value },
            { translateY: y.value },
          ],
        }
      })

    const handler = useAnimatedGestureHandler({
  
      onActive: (evt, ctx) => {
        x.value = dropx.value + evt.translationX
        y.value = dropy.value + evt.translationY
      },
  
      onEnd: evt => {
        dropx.value = x.value
        dropy.value = y.value
      },
    });
    
    const style = [{height: 100, width: 100}, animatedStyle]
    
    return (
      <View>
        <PanGestureHandler activeOffsetX={[-10, 10]} onGestureEvent={handler}>
            <Animated.View style={ style.concat({backgroundColor: 'red'}) } />
        </PanGestureHandler>
        <Animated.View style={ style.concat({backgroundColor: 'blue'}) } />
      </View>
    )
}

// main component

const tests = [
    <Test1 />,
    <Test2 />,
]

const AnimatedStyleMultipleViews = () => {
    return (
        <View>
            { tests.map((item, i) => (<View key={ `view-${ i }` }>{ item }<HR /></View>)) }
        </View>
    )
}

export default AnimatedStyleMultipleViews;

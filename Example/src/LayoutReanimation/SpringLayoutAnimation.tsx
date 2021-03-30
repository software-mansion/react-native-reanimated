import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { AnimatedRoot, withSpring } from 'react-native-reanimated';

function Box({label, state}: {label: string, state: boolean}) {
  return (
    <View style={[styles.box,{ 
        flexDirection: (state)? 'row': 'row-reverse',height: (state)? 30: 60}]}>
      <Text> {label} </Text>
    </View>
  );
}

export function SpringLayoutAnimation(): React.ReactElement {
  const [state, setState] =  useState(true);
  return (
    <View style={{marginTop: 30}} >
      <View style={{height: 300}} >
        <AnimatedRoot animation={withSpring(1)} isShallow={false} style={{flexDirection: state? 'row' : 'column'}} >
          {state && <Box key="a" label="A" state={state} />}
          <Box key="b" label="B" state={state} />
          {!state && <Box key="a" label="A" state={state} />}
          <Box key="c" label="C" state={state} />
        </AnimatedRoot>
      </View>
    
      <Button onPress={() => {setState(!state)}} title="toggle" />
    </View>
  );
}

const styles = StyleSheet.create(
  {
    box: {
      margin: 20,
      padding: 5,
      borderWidth: 1,
      borderColor: 'black',
      width: 60,
      height: 60,
    }
  }
);


/*
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import Animated, { AnimatedRoot, withTiming, withSpring, withRepeat, slideAppearingAnimation } from 'react-native-reanimated';
import { transform } from '@babel/core';

function Box({label, state}) {
  let sz = 100;
  if (state) {
    sz = 50;
  } 
  return (
    <View style={[styles.box,{flexDirection: (state)? 'row': 'column'}]}>
      <Text>{label}</Text>
      <Text>{label}</Text>
    </View>
  );
}

export default function Screen() {
  const [state, setState] =  useState(true);

  useAnimatedStyle((appearingInfo, ) => {

  })
  return (
    <View style={{marginTop: 30}}>
      <AnimatedRoot animation={withSpring(1)} isShallow={true} style={{flexDirection: state? 'row' : 'column'}} onAppearAnimation={slideAppearingAnimation} onDisappearAnimation={animatedstyle} >
        {state && <Box key="a" label="A" state={state} />}
        <Box key="b" label="B" />
        {!state && <Box key="a" label="A" state={state}/>}
        <Animated.View style={}></Animated.View>
      </AnimatedRoot>
      <Button onPress={() => {setState(!state)}} title="toggle" />
    </View>
  );
}

function animatedStyle(x, y, width, height, animationProgress) {
  'worklet'
  return {
    x: animationProgress * x,
    y: y,
    ...,
    opacity: animationProgress
  }
}



const styles = StyleSheet.create(
  {
    box: {
      margin: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: 'black',
      width: 100,
      height: 100,
    }
  }
); */
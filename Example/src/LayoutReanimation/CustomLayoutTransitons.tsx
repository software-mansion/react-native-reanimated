import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import Animated, { AnimatedLayout, Layout, withDelay, withSpring, withTiming } from 'react-native-reanimated';

function CustomLayoutTransition(values) {
  'worklet'
  return {
    animations: {
      originX: withTiming(values.originX, {duration: 1000}),
      originY: withDelay(1000, withTiming(values.originY, {duration: 1000})),
      width: withSpring(values.width),
      height: withSpring(values.height),
    },
    initialValues: {
      originX: values.boriginX,
      originY: values.boriginY,
      width: values.bwidth,
      height: values.bheight,
    }
  };
}

function Box({label, state}: {label: string, state: boolean}) {
  const ind = label.charCodeAt(0) - ('A').charCodeAt(0);
  const delay = 300 * ind;
  return (
    <Animated.View 
        layout={CustomLayoutTransition} 
        style={[styles.box,
          { 
            flexDirection: (state)? 'row': 'row-reverse', 
            height: (state)? 30: 60,
          }]} 
    >
      <Text> {label} </Text>
    </Animated.View>
  );
}

export function CustomLayoutTransitionExample(): React.ReactElement {
  const [state, setState] =  useState(true);
  return (
    <View style={{marginTop: 30}} >
      <View style={{height: 300}} >
        <AnimatedLayout style={{flexDirection: state? 'row' : 'column'}} >
          {state && <Box key="a" label="A" state={state} />}
          <Box key="b" label="B" state={state} />
          {!state && <Box key="a" label="A" state={state} />}
          <Box key="c" label="C" state={state} />
        </AnimatedLayout>
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
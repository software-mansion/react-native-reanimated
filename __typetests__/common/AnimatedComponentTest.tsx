/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, ScrollView, FlatList } from 'react-native';
import Animated from '../..';

function AnimatedComponentPropsTest() {
  const RNStyle: ViewStyle = {};

  function AnimatedComponentPropsTestStyle() {
    const MyAnimatedView = Animated.createAnimatedComponent(View);
    const MyAnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
    const MyAnimatedFlatList = Animated.createAnimatedComponent(FlatList);

    return (
      <View>
        <Animated.View style={RNStyle} />
        <MyAnimatedView style={RNStyle} />
        <Animated.ScrollView style={RNStyle} />
        <MyAnimatedScrollView style={RNStyle} />
        <Animated.FlatList
          style={RNStyle}
          data={[]}
          renderItem={() => <View />}
        />
        <MyAnimatedFlatList
          style={RNStyle}
          data={[]}
          renderItem={() => <View />}
        />
      </View>
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AnimatedComponentPropsTestReanimatedProps(prop: any) {
  class CustomClassComponent extends React.Component<never> {
    render() {
      return null;
    }
  }
  const AnimatedCustomClassComponent =
    Animated.createAnimatedComponent(CustomClassComponent);

  return (
    <>
      <Animated.View
        entering={prop}
        layout={prop}
        exiting={prop}
        sharedTransitionTag={prop}
        sharedTransitionStyle={prop}
        animatedProps={prop}
      />
      <Animated.Image
        entering={prop}
        layout={prop}
        exiting={prop}
        sharedTransitionTag={prop}
        sharedTransitionStyle={prop}
        animatedProps={prop}
        source={{ uri: undefined }}
      />
      <Animated.Text
        entering={prop}
        layout={prop}
        exiting={prop}
        sharedTransitionTag={prop}
        sharedTransitionStyle={prop}
        animatedProps={prop}
      />
      <Animated.ScrollView
        entering={prop}
        layout={prop}
        exiting={prop}
        sharedTransitionTag={prop}
        sharedTransitionStyle={prop}
        animatedProps={prop}
      />
      <Animated.FlatList
        entering={prop}
        layout={prop}
        exiting={prop}
        sharedTransitionTag={prop}
        sharedTransitionStyle={prop}
        animatedProps={prop}
        data={[]}
        renderItem={() => null}
      />
      <AnimatedCustomClassComponent
        entering={prop}
        layout={prop}
        exiting={prop}
        sharedTransitionTag={prop}
        sharedTransitionStyle={prop}
        animatedProps={prop}
      />
    </>
  );
}

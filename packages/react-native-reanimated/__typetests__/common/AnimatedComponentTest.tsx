/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import type { ViewStyle } from 'react-native';
import { FlatList, ScrollView, View } from 'react-native';

import type { AnimatedStyle } from '../..';
import Animated from '../..';

function AnimatedStyleRecursiveReadonlyArrayTest() {
  type TestStyleProp<T> = T | ReadonlyArray<TestStyleProp<T>>;

  const style: AnimatedStyle<TestStyleProp<ViewStyle>> = {};
}

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
          // @ts-expect-error
          CellRendererComponent={() => {
            return <View />;
          }}
          data={[]}
          renderItem={() => <View />}
        />
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
  class CustomClassComponent extends React.Component<unknown> {
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
        animatedProps={prop}
      />
      <Animated.Image
        entering={prop}
        layout={prop}
        exiting={prop}
        animatedProps={prop}
        source={{ uri: undefined }}
      />
      <Animated.Text
        entering={prop}
        layout={prop}
        exiting={prop}
        animatedProps={prop}
      />
      <Animated.ScrollView
        entering={prop}
        layout={prop}
        exiting={prop}
        animatedProps={prop}
      />
      <Animated.FlatList
        entering={prop}
        layout={prop}
        exiting={prop}
        animatedProps={prop}
        data={[]}
        renderItem={() => null}
      />
      <AnimatedCustomClassComponent
        entering={prop}
        layout={prop}
        exiting={prop}
        animatedProps={prop}
      />
    </>
  );
}

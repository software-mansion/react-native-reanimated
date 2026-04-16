/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { FlatList, ScrollView } from 'react-native';

import Animated, { useAnimatedScrollHandler, useSharedValue } from '../..';

function UseAnimatedScrollHandlerTest() {
  function UseAnimatedScrollHandlerTest1() {
    const CustomScrollView = Animated.createAnimatedComponent(ScrollView);
    const CustomFlatList = Animated.createAnimatedComponent(FlatList);
    const scrollHandler1 = useAnimatedScrollHandler((event) => {
      console.log(event.contentOffset.x);
      console.log(event.eventName);
    });
    const scrollHandler2 = useAnimatedScrollHandler({
      onScroll: (event) => {
        console.log(event.contentOffset.x);
        console.log(event.eventName);
      },
      // @ts-expect-error Properly detects wrong event name.
      onWrongEvent: (event) => {
        console.log(event.contentOffset.x);
        console.log(event.eventName);
      },
    });

    return (
      <>
        <Animated.ScrollView onScroll={scrollHandler1} />
        <Animated.ScrollView onScroll={scrollHandler2} />
        <CustomScrollView onScroll={scrollHandler1} />
        <CustomScrollView onScroll={scrollHandler2} />
        <Animated.FlatList
          onScroll={scrollHandler1}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          onScroll={scrollHandler2}
          data={[]}
          renderItem={null}
        />
        <CustomFlatList onScroll={scrollHandler1} data={[]} renderItem={null} />
        <CustomFlatList onScroll={scrollHandler2} data={[]} renderItem={null} />
      </>
    );
  }

  function UseAnimatedScrollHandlerTest2() {
    const CustomScrollView = Animated.createAnimatedComponent(ScrollView);
    const CustomFlatList = Animated.createAnimatedComponent(FlatList);
    const scrollHandler = useAnimatedScrollHandler(
      // @ts-expect-error `event` is a `ReanimatedEvent`.
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // @ts-expect-error `event` is a `ReanimatedEvent`.
        console.log(event.contentOffset.x);
        // @ts-expect-error `event` is a `ReanimatedEvent`.
        console.log(event.eventName);
      }
    );
    return (
      <>
        <Animated.ScrollView onScroll={scrollHandler} />
        <CustomScrollView onScroll={scrollHandler} />
        <Animated.FlatList
          onScroll={scrollHandler}
          data={[]}
          renderItem={null}
        />
        <CustomFlatList onScroll={scrollHandler} data={[]} renderItem={null} />
      </>
    );
  }

  function UseAnimatedScrollHandlerTest3() {
    const CustomScrollView = Animated.createAnimatedComponent(ScrollView);
    const CustomFlatList = Animated.createAnimatedComponent(FlatList);

    const x = useSharedValue(0);
    // This cast works because it's narrowing.
    const scrollHandler = useAnimatedScrollHandler(
      (event: NativeScrollEvent) => {
        console.log(event.contentOffset.x);
        // @ts-expect-error This gives error because of the cast.
        console.log(event.eventName);
      }
    );
    return (
      <>
        <Animated.ScrollView onScroll={scrollHandler} />
        <CustomScrollView onScroll={scrollHandler} />
        <Animated.FlatList
          onScroll={scrollHandler}
          data={[]}
          renderItem={null}
        />
        <CustomFlatList onScroll={scrollHandler} data={[]} renderItem={null} />
      </>
    );
  }
}

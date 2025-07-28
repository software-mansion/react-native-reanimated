/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef } from 'react';
import { Button, FlatList, ScrollView } from 'react-native';

import Animated, { useAnimatedRef, useScrollOffset } from '../..';

function useScrollOffsetTest() {
  function useScrollOffsetTest1() {
    const scrollViewRef = useRef<ScrollView>(null);
    // @ts-expect-error Funny enough, it works like this in runtime,
    // but we call TS error here for extra safety anyway.
    const offset = useScrollOffset(scrollViewRef);

    return (
      // @ts-expect-error Cannot assign plain ref to Animated ref.
      <Animated.ScrollView ref={scrollViewRef}>
        <Animated.View style={{ opacity: offset.value }} />
      </Animated.ScrollView>
    );
  }

  function useScrollOffsetTest2() {
    const scrollViewRef = useRef<Animated.ScrollView>(null);
    // @ts-expect-error Cannot use plain ref with `useScrollOffset`.
    const offset = useScrollOffset(scrollViewRef);

    return (
      <Animated.ScrollView ref={scrollViewRef}>
        <Animated.View style={{ opacity: offset.value }} />
      </Animated.ScrollView>
    );
  }

  function useScrollOffsetTest3() {
    const scrollViewRef = useRef<FlatList>(null);
    // @ts-expect-error Cannot use plain ref with `useScrollOffset`.
    const offset = useScrollOffset(scrollViewRef);

    return (
      <FlatList
        ref={scrollViewRef}
        data={[{ offset }]}
        renderItem={({ item }) => (
          <Animated.View style={{ opacity: item.offset.value }} />
        )}
      />
    );
  }

  function useScrollOffsetTest4() {
    const scrollViewRef = useRef<Animated.FlatList>(null);
    // @ts-expect-error Cannot use plain ref with `useScrollOffset`.
    const offset = useScrollOffset(scrollViewRef);

    return (
      <Animated.FlatList
        ref={scrollViewRef}
        data={[{ offset }]}
        renderItem={({ item }) => (
          <Animated.View style={{ opacity: item.offset.value }} />
        )}
      />
    );
  }

  function useScrollOffsetTest5() {
    const scrollViewRef = useAnimatedRef<ScrollView>();
    // Accepts plain ScrollView animated ref
    const offset = useScrollOffset(scrollViewRef);

    return (
      <ScrollView ref={scrollViewRef}>
        <Animated.View style={{ opacity: offset.value }} />
      </ScrollView>
    );
  }

  function useScrollOffsetTest6() {
    const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
    // Accepts animated ScrollView animated ref
    const offset = useScrollOffset(scrollViewRef);

    return (
      <Animated.ScrollView ref={scrollViewRef}>
        <Animated.View style={{ opacity: offset.value }} />
      </Animated.ScrollView>
    );
  }

  function useScrollOffsetTest7() {
    const scrollViewRef = useAnimatedRef<FlatList>();
    // Accepts plain FlatList animated ref
    const offset = useScrollOffset(scrollViewRef);

    return (
      <FlatList
        ref={scrollViewRef}
        data={[{ offset }]}
        renderItem={({ item }) => (
          <Animated.View style={{ opacity: item.offset.value }} />
        )}
      />
    );
  }

  function useScrollOffsetTest8() {
    const scrollViewRef = useAnimatedRef<Animated.FlatList>();
    // Accepts animated FlatList animated ref
    const offset = useScrollOffset(scrollViewRef);

    return (
      <Animated.FlatList
        ref={scrollViewRef}
        data={[{ offset }]}
        renderItem={({ item }) => (
          <Animated.View style={{ opacity: item.offset.value }} />
        )}
      />
    );
  }

  function useScrollOffsetTest9() {
    const [connectRef, setConnectRef] = React.useState(false);
    const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
    // this will work because the ref is nullable
    const offset = useScrollOffset(connectRef ? scrollViewRef : null);

    return (
      <ScrollView ref={scrollViewRef}>
        <Button
          title={`${connectRef ? 'Disconnect' : 'Connect'} ref`}
          onPress={() => setConnectRef(!connectRef)}
        />
        <Animated.View style={{ opacity: offset.value }} />
      </ScrollView>
    );
  }
}

/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef } from 'react';
import type { FlatList } from 'react-native';
import { Button, ScrollView } from 'react-native';

import Animated, {
  useAnimatedRef,
  useScrollOffset,
} from '../../lib/typescript';

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
      <Animated.FlatList
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
    // @ts-expect-error Properly detects that non-animated component was used.
    const offset = useScrollOffset(scrollViewRef);

    return (
      <ScrollView ref={scrollViewRef}>
        <Animated.View style={{ opacity: offset.value }} />
      </ScrollView>
    );
  }

  function useScrollOffsetTest6() {
    const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
    const offset = useScrollOffset(scrollViewRef);

    return (
      <ScrollView ref={scrollViewRef}>
        <Animated.View style={{ opacity: offset.value }} />
      </ScrollView>
    );
  }

  function useScrollOffsetTest7() {
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

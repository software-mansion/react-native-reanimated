/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef } from 'react';
import { Button, ScrollView } from 'react-native';

import Animated, { useAnimatedRef, useScrollViewOffset } from '../..';

function UseScrollViewOffsetTest() {
  function UseScrollViewOffsetTest1() {
    const scrollViewRef = useRef<ScrollView>(null);
    // @ts-expect-error Funny enough, it works like this in runtime,
    // but we call TS error here for extra safety anyway.
    const offset = useScrollViewOffset(scrollViewRef);

    return (
      // @ts-expect-error Cannot assign plain ref to Animated ref.
      <Animated.ScrollView ref={scrollViewRef}>
        <Animated.View style={{ opacity: offset.value }} />
      </Animated.ScrollView>
    );
  }

  function UseScrollViewOffsetTest2() {
    const scrollViewRef = useRef<Animated.ScrollView>(null);
    // @ts-expect-error Cannot use plain ref with `useScrollViewOffset`.
    const offset = useScrollViewOffset(scrollViewRef);

    return (
      <Animated.ScrollView ref={scrollViewRef}>
        <Animated.View style={{ opacity: offset.value }} />
      </Animated.ScrollView>
    );
  }

  function UseScrollViewOffsetTest3() {
    const scrollViewRef = useAnimatedRef<ScrollView>();
    // @ts-expect-error Properly detects that non-animated component was used.
    const offset = useScrollViewOffset(scrollViewRef);

    return (
      <ScrollView ref={scrollViewRef}>
        <Animated.View style={{ opacity: offset.value }} />
      </ScrollView>
    );
  }

  function UseScrollViewOffsetTest4() {
    const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
    const offset = useScrollViewOffset(scrollViewRef);

    return (
      <ScrollView ref={scrollViewRef}>
        <Animated.View style={{ opacity: offset.value }} />
      </ScrollView>
    );
  }

  function UseScrollViewOffsetTest5() {
    const [connectRef, setConnectRef] = React.useState(false);
    const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
    // this will work because the ref is nullable
    const offset = useScrollViewOffset(connectRef ? scrollViewRef : null);

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

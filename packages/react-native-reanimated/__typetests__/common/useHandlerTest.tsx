/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import type { ReanimatedEvent } from '../..';
import Animated, { useEvent, useHandler } from '../..';

function UseHandlerTest() {
  function UseHandlerTest1() {
    type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;
    const dependencies = [{ isWeb: false }];
    const handlers = {
      onScroll: (event: ReanimatedEvent<ScrollEvent>) => {
        'worklet';
        console.log(event);
      },
    };

    const { context, doDependenciesDiffer, useWeb } = useHandler(
      handlers,
      dependencies
    );

    const customScrollHandler = useEvent(
      (event: ReanimatedEvent<ScrollEvent>) => {
        'worklet';
        const { onScroll } = handlers;
        if (onScroll && event.eventName.endsWith('onScroll')) {
          context.eventName = event.eventName + useWeb;
          onScroll(event);
        }
      },
      ['onScroll'],
      doDependenciesDiffer
    );

    return <Animated.ScrollView onScroll={customScrollHandler} />;
  }

  function UseHandlerTest2() {
    type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;
    const dependencies = [{ isWeb: false }];
    const handlers = {
      onScroll: (event: ScrollEvent) => {
        'worklet';
        console.log(event);
      },
    };

    const { context, doDependenciesDiffer, useWeb } = useHandler(
      // @ts-expect-error Works with `ReanimatedEvent` only.
      handlers,
      dependencies
    );

    const customScrollHandler = useEvent(
      (event: ReanimatedEvent<ScrollEvent>) => {
        'worklet';
        const { onScroll } = handlers;
        if (onScroll && event.eventName.endsWith('onScroll')) {
          context.eventName = event.eventName + useWeb;
          // @ts-expect-error Works with `ReanimatedEvent` only.
          onScroll(event);
        }
      },
      ['onScroll'],
      doDependenciesDiffer
    );

    return <Animated.ScrollView onScroll={customScrollHandler} />;
  }

  function UseHandlerTest3() {
    type ScrollEvent = NativeScrollEvent;
    const dependencies = [{ isWeb: false }];
    const handlers = {
      onScroll: (event: ScrollEvent) => {
        'worklet';
        console.log(event);
      },
    };

    const { context, doDependenciesDiffer, useWeb } = useHandler(
      handlers,
      dependencies
    );

    const customScrollHandler = useEvent<NativeSyntheticEvent<ScrollEvent>>(
      (event: ReanimatedEvent<ScrollEvent>) => {
        'worklet';
        const { onScroll } = handlers;
        if (onScroll && event.eventName.endsWith('onScroll')) {
          context.eventName = event.eventName + useWeb;
          onScroll(event);
        }
      },
      ['onScroll'],
      doDependenciesDiffer
    );

    return <Animated.ScrollView onScroll={customScrollHandler} />;
  }
}

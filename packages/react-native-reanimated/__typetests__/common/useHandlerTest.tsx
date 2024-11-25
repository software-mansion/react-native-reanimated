/* eslint-disable import/no-unresolved */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, { useEvent, useHandler } from '../..';
import type { ReanimatedEvent } from '../..';

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

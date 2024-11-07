/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import Animated, {
  useAnimatedScrollHandler,
  useComposedEventHandler,
  useEvent,
} from '../../src';
import { Text } from 'react-native';
import type { ReanimatedEvent } from '../../src';

function useComposedEventHandlerTest() {
  function useComposedEventHandlerTestDifferentHandlers() {
    function useCustomScrollHandler(
      handler: (event: ReanimatedEvent<object>) => void
    ) {
      return useEvent(
        (event) => {
          'worklet';
          handler(event);
        },
        ['onScroll']
      );
    }

    const onScrollCustomHandler = useCustomScrollHandler((e) => {
      'worklet';
      console.log(`custom scroll handler invoked on ${e.eventName}`);
    });

    const onScrollHandler = useAnimatedScrollHandler((e) => {
      console.log(`scroll handler invoked on ${e.eventName}`);
    });

    const composedHandler = useComposedEventHandler([
      onScrollHandler,
      onScrollCustomHandler,
    ]);

    return (
      <>
        <Animated.ScrollView onScroll={composedHandler}>
          {[...new Array(20)].map((_each, index) => (
            <Text>{index}</Text>
          ))}
        </Animated.ScrollView>
      </>
    );
  }

  function useComposedEventHandlerTestDifferentProps() {
    const onDragBeginHandler = useAnimatedScrollHandler({
      onBeginDrag(e) {
        'worklet';
        console.log('Drag begin');
      },
    });

    const onDragEndHandler = useAnimatedScrollHandler({
      onEndDrag(e) {
        'worklet';
        console.log('Drag end');
      },
    });

    const composedHandler1 = useComposedEventHandler([
      onDragBeginHandler,
      onDragEndHandler,
    ]);

    const composedHandler2 = useComposedEventHandler([
      onDragBeginHandler,
      onDragEndHandler,
    ]);

    return (
      <>
        <Animated.ScrollView
          // This will work well thanks to the way it is filtered in `PropsFilter`.
          onMomentumScrollBegin={composedHandler1}
          // same as above
          onMomentumScrollEnd={composedHandler2}>
          {[...new Array(20)].map((_each, index) => (
            <Text>{index}</Text>
          ))}
        </Animated.ScrollView>
      </>
    );
  }
}

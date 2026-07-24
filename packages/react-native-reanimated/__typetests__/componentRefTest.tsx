/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ComponentRef } from 'react';
import React, { useRef } from 'react';
import { Image, Text, View } from 'react-native';

import Animated, { useAnimatedRef } from '..';

function ComponentRefTest() {
  const CreatedAnimatedView = Animated.createAnimatedComponent(View);

  const viewRef = useRef<ComponentRef<typeof View>>(null);
  const animatedViewRef = useRef<ComponentRef<typeof Animated.View>>(null);
  const createdAnimatedViewRef =
    useRef<ComponentRef<typeof CreatedAnimatedView>>(null);
  const animatedRef = useAnimatedRef<Animated.View>();
  const animatedTextRef = useRef<ComponentRef<typeof Animated.Text>>(null);
  const animatedImageRef = useRef<ComponentRef<typeof Animated.Image>>(null);

  // ComponentRef must resolve to the underlying native instance rather than
  // the animated component type or never.
  animatedViewRef.current?.measure((x, y, width, height, pageX, pageY) => {
    const coordinates: number[] = [x, y, width, height, pageX, pageY];
    return coordinates;
  });

  return (
    <>
      <View ref={animatedViewRef} />
      <Animated.View ref={viewRef} />
      <Animated.View ref={animatedViewRef} />
      <Animated.View ref={animatedRef} />
      <CreatedAnimatedView ref={viewRef} />
      <CreatedAnimatedView ref={createdAnimatedViewRef} />
      <CreatedAnimatedView ref={animatedRef} />
      <Text ref={animatedTextRef} />
      <Animated.Text ref={animatedTextRef} />
      <Image ref={animatedImageRef} source={{}} />
      <Animated.Image ref={animatedImageRef} source={{}} />
    </>
  );
}

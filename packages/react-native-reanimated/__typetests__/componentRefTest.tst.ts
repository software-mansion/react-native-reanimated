import type { ComponentPropsWithRef, ComponentRef } from 'react';
import { useRef } from 'react';
import { type Image, type Text, View } from 'react-native';
import { describe, expect, test } from 'tstyche';

import Animated, { useAnimatedRef } from '..';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CreatedAnimatedView = Animated.createAnimatedComponent(View);

describe('ComponentRef', () => {
  test('resolves animated components to their underlying native instances', () => {
    expect<ComponentRef<typeof Animated.View>>().type.toBe<
      ComponentRef<typeof View>
    >();
    expect<ComponentRef<typeof CreatedAnimatedView>>().type.toBe<
      ComponentRef<typeof View>
    >();
    expect<ComponentRef<typeof Animated.Text>>().type.toBe<
      ComponentRef<typeof Text>
    >();
    expect<ComponentRef<typeof Animated.Image>>().type.toBe<
      ComponentRef<typeof Image>
    >();
  });

  test('accepts plain and animated refs on animated views', () => {
    const viewRef = useRef<ComponentRef<typeof View>>(null);
    const animatedViewRef = useRef<ComponentRef<typeof Animated.View>>(null);
    const createdAnimatedViewRef =
      useRef<ComponentRef<typeof CreatedAnimatedView>>(null);
    const animatedRef = useAnimatedRef<Animated.View>();

    expect(viewRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof Animated.View>['ref']
    >();
    expect(viewRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof CreatedAnimatedView>['ref']
    >();
    expect(animatedViewRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof View>['ref']
    >();
    expect(animatedViewRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof Animated.View>['ref']
    >();
    expect(createdAnimatedViewRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof CreatedAnimatedView>['ref']
    >();
    expect(animatedRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof Animated.View>['ref']
    >();
    expect(animatedRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof CreatedAnimatedView>['ref']
    >();
  });

  test('preserves the native measure method', () => {
    type AnimatedViewRef = ComponentRef<typeof Animated.View>;

    expect<AnimatedViewRef['measure']>().type.toBeCallableWith(
      (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number
      ) => {
        const coordinates: number[] = [x, y, width, height, pageX, pageY];
        return coordinates;
      }
    );
  });

  test('accepts matching text and image refs', () => {
    const animatedTextRef = useRef<ComponentRef<typeof Animated.Text>>(null);
    const animatedImageRef = useRef<ComponentRef<typeof Animated.Image>>(null);

    expect(animatedTextRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof Text>['ref']
    >();
    expect(animatedTextRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof Animated.Text>['ref']
    >();
    expect(animatedImageRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof Image>['ref']
    >();
    expect(animatedImageRef).type.toBeAssignableTo<
      ComponentPropsWithRef<typeof Animated.Image>['ref']
    >();
  });
});

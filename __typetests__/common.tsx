/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useCallback, forwardRef, useRef } from 'react';
import type {
  FlatListProps,
  ViewProps,
  ImageProps,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { StyleSheet, Button, View, Image, ScrollView } from 'react-native';
import type {
  PanGestureHandlerGestureEvent,
  PinchGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import {
  PanGestureHandler,
  PinchGestureHandler,
  FlatList,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedGestureHandler,
  Easing,
  withTiming,
  withSpring,
  cancelAnimation,
  withDelay,
  withRepeat,
  withSequence,
  withDecay,
  useWorkletCallback,
  runOnUI,
  useAnimatedReaction,
  interpolateColor,
  makeMutable,
  createAnimatedPropAdapter,
  useAnimatedProps,
  useAnimatedRef,
  dispatchCommand,
  measure,
  scrollTo,
  setGestureState,
  isSharedValue,
  makeShareableCloneRecursive,
  useEvent,
  useScrollViewOffset,
  useHandler,
} from '..';
import type { ReanimatedEvent } from '..';

class Path extends React.Component<{ fill?: string }> {
  render() {
    return null;
  }
}

type Item = {
  id: number;
};

const SomeFC = (props: ViewProps) => {
  return <View {...props} />;
};

const SomeFCWithRef = forwardRef((props: ViewProps) => {
  return <View {...props} />;
});

// Class Component -> Animated Class Component
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const AnimatedTypedFlatList =
  Animated.createAnimatedComponent<FlatListProps<Item[]>>(FlatList);

// Function Component -> Animated Function Component
const AnimatedFC = Animated.createAnimatedComponent(SomeFC);
const AnimatedFCWithRef = Animated.createAnimatedComponent(SomeFCWithRef);

function CreateAnimatedComponentTest1() {
  const animatedProps = useAnimatedProps(() => ({ fill: 'blue' }));
  return (
    <AnimatedPath
      animatedProps={animatedProps}
      // @ts-expect-error `style` was not defined in `Path`'s props
      style={{ backgroundColor: 'red' }}
    />
  );
}

function CreateAnimatedComponentTest2() {
  const animatedProps = useAnimatedProps(() => ({ fill2: 'blue' }));
  return (
    // @ts-expect-error
    <AnimatedPath animatedProps={animatedProps} />
  );
}

function CreateAnimatedComponentTest3() {
  const animatedProps = useAnimatedProps(
    () => ({ pointerEvents: 'none' } as const)
  );
  return (
    <Animated.View animatedProps={animatedProps}>
      <AnimatedPath />
    </Animated.View>
  );
}

function CreateAnimatedFlatListTest1() {
  const renderItem = useCallback(
    ({ item, index }: { item: Item[]; index: number }) => {
      if (Math.random()) {
        return null;
      }
      return <View style={{ width: 100 }} />;
    },
    []
  );
  return (
    <>
      <AnimatedTypedFlatList
        style={{ flex: 1 }}
        data={[]}
        renderItem={renderItem}
      />
      <AnimatedFlatList
        // @ts-expect-error
        style={{ flex: 1, red: false }}
        data={[]}
        renderItem={() => null}
      />
      <AnimatedImage style={{ flex: 1 }} source={{ uri: '' }} />
    </>
  );
}

function CreateAnimatedFlatListTest2() {
  return (
    <>
      <Animated.FlatList
        data={[{ foo: 1 }]}
        renderItem={({ item, index }) => <View key={item.foo} />}
      />
    </>
  );
}

// This tests checks if the type of the contentContainerStyle
// (or any other '...Style') is treated the same
// as the style prop of the AnimatedFlatList.
function CreateAnimatedFlatListTest3(
  contentContainerStyle: React.ComponentProps<
    typeof AnimatedFlatList
  >['contentContainerStyle']
) {
  const newContentContainerStyle = [contentContainerStyle, { flex: 1 }];

  return (
    <AnimatedFlatList
      data={[{ foo: 1 }]}
      renderItem={() => null}
      contentContainerStyle={newContentContainerStyle}
    />
  );
}

// This tests checks if the type of the contentContainerStyle
// (or any other '...Style') is treated the same
// as the style prop of the AnimatedFlatList.
function CreateAnimatedFlatListTest4(
  contentContainerStyle: React.ComponentProps<typeof AnimatedFlatList>['style']
) {
  return (
    <AnimatedFlatList
      data={[{ foo: 1 }]}
      renderItem={() => null}
      contentContainerStyle={contentContainerStyle}
    />
  );
}

function TestClassComponentRef() {
  const animatedRef = useAnimatedRef<React.Component<ImageProps>>();
  return <AnimatedImage ref={animatedRef} source={{}} />;
}

function TestFunctionComponentRef() {
  const animatedRef = useAnimatedRef<React.Component<ViewProps>>();
  return (
    <AnimatedFC
      // @ts-expect-error ref is not available on plain function-components
      ref={animatedRef}
    />
  );
}

function TestFunctionComponentForwardRef() {
  const animatedRef = useAnimatedRef<React.Component<ViewProps>>();
  return <AnimatedFCWithRef ref={animatedRef} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  box: {
    height: 50,
    backgroundColor: 'blue',
  },
});

/**
 * Reanimated 2 Functions
 */

// makeMutable
function MakeMutableTest() {
  const mut = makeMutable(0);
  const mut2 = makeMutable(true);

  return <Animated.View style={styles.container} />;
}

// makeShareableCloneRecursive
function MakeShareableCloneRecursiveTest() {
  const mut = makeShareableCloneRecursive(0);
  const mut2 = makeShareableCloneRecursive(true);
  const mut3 = makeShareableCloneRecursive({ foo: 'bar' });
}

/**
 * Reanimated 2 Hooks
 */

// useSharedValue
function SharedValueTest() {
  const translate = useSharedValue(0);
  const translate2 = useSharedValue(0);
  const translate3 = useSharedValue(0);

  const sharedBool = useSharedValue<boolean>(false);
  if (sharedBool.value) {
    sharedBool.value = false;
  }

  return <Animated.View style={styles.container} />;
}

// isSharedValue
function IsSharedValueTest() {
  const sv = useSharedValue(0);

  isSharedValue(null);
  isSharedValue(undefined);
  isSharedValue(42);
  isSharedValue('foo');
  isSharedValue({ foo: 'bar' });
  isSharedValue(sv);
}

// useAnimatedStyle
function AnimatedStyleTest() {
  const width = useSharedValue(50);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
    };
  });
  return <Animated.View style={[styles.box, animatedStyle]} />;
}

// useAnimatedStyle with arrays (invalid return)
function AnimatedStyleArrayTest() {
  const width = useSharedValue(50);
  // @ts-expect-error since the animated style cannot be an array.
  const animatedStyle = useAnimatedStyle(() => {
    return [styles.box, { width: width.value }];
  });
  return <Animated.View style={[styles.box, animatedStyle]} />;
}

// useAnimatedStyle with null (invalid return)
function AnimatedStyleNullTest() {
  const width = useSharedValue(50);
  // @ts-expect-error since the animated style cannot be "false".
  const animatedStyle = useAnimatedStyle(() => false);
  return <Animated.View style={[styles.box, animatedStyle]} />;
}

// useAnimatedStyle with number (invalid return)
function AnimatedStyleNumberTest() {
  const width = useSharedValue(50);
  // @ts-expect-error since the animated style cannot be a number.
  const animatedStyle = useAnimatedStyle(() => 5);
  return <Animated.View style={[styles.box, animatedStyle]} />;
}

// useDerivedValue
function DerivedValueTest() {
  const progress = useSharedValue(0);
  const width = useDerivedValue(() => {
    return progress.value * 250;
  });
  // @ts-expect-error width is readonly
  width.value = 100;
  return (
    <Button title="Random" onPress={() => (progress.value = Math.random())} />
  );
}

// useAnimatedScrollHandler
function AnimatedScrollHandlerTest() {
  const translationY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    translationY.value = event.contentOffset.y;
  });
  // We allow using colors in useAnimatedStyle but it's not a part
  // of a public API hence we expect an error here.
  // @ts-expect-error color cannot be a number
  const stylez = useAnimatedStyle(() => {
    return {
      color: 'red',
      backgroundColor: 0x00ff00,
      transform: [
        {
          translateY: translationY.value,
        },
        {
          rotate: `${Math.PI}rad`,
        },
      ],
    };
  });
  // @ts-expect-error Valid rotation is a string (either radians or degrees)
  const style2 = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: Math.PI,
        },
      ],
    };
  });
  // @ts-expect-error color cannot be an object
  const style3 = useAnimatedStyle(() => {
    return {
      color: {},
    };
  });
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, stylez]} />
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} />
    </View>
  );
}

// useAnimatedGestureHandler with context
function AnimatedGestureHandlerTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
    onStart: (_, ctx) => {
      ctx.startX = x.value;
    },
    onActive: (event, ctx) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = 0;
    },
  });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        },
      ],
    };
  });
  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PanGestureHandler>
  );
}

function AnimatedPinchGestureHandlerTest() {
  const x = useSharedValue(0);
  const gestureHandler =
    useAnimatedGestureHandler<PinchGestureHandlerGestureEvent>({
      onActive: (event) => {
        x.value = event.scale;
      },
      onEnd: () => {
        x.value = withTiming(1);
      },
    });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: x.value,
        },
      ],
    };
  });
  return (
    <PinchGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PinchGestureHandler>
  );
}

// useEvent

function TestUseEventNativeSyntheticEvent() {
  type CustomEventPayload = {
    foo: string;
  };
  type RNEvent = NativeSyntheticEvent<CustomEventPayload>;
  type CustomProps = {
    onCustomEvent: (event: RNEvent) => void;
  };
  function CustomComponent(props: CustomProps) {
    return null;
  }
  const CustomAnimatedComponent =
    Animated.createAnimatedComponent(CustomComponent);

  const eventHandler1 = useEvent<RNEvent>((event) => {
    event.eventName;
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  const eventHandler2 = useEvent<RNEvent>((event: ReanimatedEvent<RNEvent>) => {
    event.eventName;
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  const eventHandler3 = useEvent((event: ReanimatedEvent<RNEvent>) => {
    event.eventName;
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  const eventHandler4 = useEvent((event) => {
    event.eventName;
    // @ts-expect-error `useEvent` cannot know the type of the event.
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  const eventHandler5 = useEvent<CustomEventPayload>((event) => {
    event.eventName;
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  return (
    <>
      <CustomAnimatedComponent onCustomEvent={eventHandler1} />;
      <CustomAnimatedComponent onCustomEvent={eventHandler2} />;
      <CustomAnimatedComponent onCustomEvent={eventHandler3} />;
      <CustomAnimatedComponent onCustomEvent={eventHandler4} />;
      {/* @ts-expect-error Properly detected wrong type */}
      <CustomAnimatedComponent onCustomEvent={eventHandler5} />;
    </>
  );
}

function TestUseEventBareEvent() {
  type CustomEventPayload = {
    foo: string;
  };
  type CustomEvent = CustomEventPayload;
  type CustomProps = {
    onCustomEvent: (event: CustomEvent) => void;
  };
  function CustomComponent(props: CustomProps) {
    return null;
  }
  const CustomAnimatedComponent =
    Animated.createAnimatedComponent(CustomComponent);

  const eventHandler1 = useEvent<CustomEvent>((event) => {
    event.eventName;
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  const eventHandler2 = useEvent<CustomEvent>(
    (event: ReanimatedEvent<CustomEvent>) => {
      event.eventName;
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    }
  );

  const eventHandler3 = useEvent((event: ReanimatedEvent<CustomEvent>) => {
    event.eventName;
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  const eventHandler4 = useEvent((event) => {
    event.eventName;
    // @ts-expect-error `useEvent` cannot know the type of the event.
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  return (
    <>
      <CustomAnimatedComponent onCustomEvent={eventHandler1} />;
      <CustomAnimatedComponent onCustomEvent={eventHandler2} />;
      <CustomAnimatedComponent onCustomEvent={eventHandler3} />;
      <CustomAnimatedComponent onCustomEvent={eventHandler4} />;
    </>
  );
}

function TestUseEventReanimatedEvent() {
  // This is not how we want users to use it, but it's legal.
  type CustomEventPayload = {
    foo: string;
  };
  type CustomReanimatedEvent = ReanimatedEvent<CustomEventPayload>;
  type CustomProps = {
    onCustomEvent: (event: CustomReanimatedEvent) => void;
  };
  function CustomComponent(props: CustomProps) {
    return null;
  }
  const CustomAnimatedComponent =
    Animated.createAnimatedComponent(CustomComponent);

  const eventHandler1 = useEvent<CustomReanimatedEvent>((event) => {
    event.eventName;
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  const eventHandler2 = useEvent<CustomReanimatedEvent>(
    (event: ReanimatedEvent<CustomReanimatedEvent>) => {
      event.eventName;
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    }
  );

  const eventHandler3 = useEvent(
    (event: ReanimatedEvent<CustomReanimatedEvent>) => {
      event.eventName;
      event.foo;
      // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
      event.nativeEvent;
    }
  );

  const eventHandler4 = useEvent((event) => {
    event.eventName;
    // @ts-expect-error `useEvent` cannot know the type of the event.
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  const eventHandler5 = useEvent<CustomEventPayload>((event) => {
    event.eventName;
    event.foo;
    // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
    event.nativeEvent;
  });

  return (
    <>
      <CustomAnimatedComponent onCustomEvent={eventHandler1} />;
      <CustomAnimatedComponent onCustomEvent={eventHandler2} />;
      <CustomAnimatedComponent onCustomEvent={eventHandler3} />;
      <CustomAnimatedComponent onCustomEvent={eventHandler4} />;
      <CustomAnimatedComponent onCustomEvent={eventHandler5} />;
    </>
  );
}

// useScrollViewOffset

function TestUseScrollViewOffset1() {
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

function TestUseScrollViewOffset2() {
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  // @ts-expect-error Cannot use plain ref with `useScrollViewOffset`.
  const offset = useScrollViewOffset(scrollViewRef);

  return (
    // TODO TYPESCRIPT After `createAnimatedComponent` is fixed
    // this shouldn't be legal (I think)
    <Animated.ScrollView ref={scrollViewRef}>
      <Animated.View style={{ opacity: offset.value }} />
    </Animated.ScrollView>
  );
}

function TestUseScrollViewOffset3() {
  // TODO TYPESCRIPT Maybe disallow using non-animated components as
  // generic argument for `useAnimatedRef`?
  const scrollViewRef = useAnimatedRef<ScrollView>();
  // @ts-expect-error Properly detects that non-animated component was used.
  const offset = useScrollViewOffset(scrollViewRef);

  return (
    <ScrollView ref={scrollViewRef}>
      <Animated.View style={{ opacity: offset.value }} />
    </ScrollView>
  );
}

function TestUseScrollViewOffset4() {
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const offset = useScrollViewOffset(scrollViewRef);

  return (
    <ScrollView ref={scrollViewRef}>
      <Animated.View style={{ opacity: offset.value }} />
    </ScrollView>
  );
}

// Test `useHandler`
function TestUseHandler1() {
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
        context.eventName = context.eventName
          ? context.eventName + event.eventName + useWeb
          : event.eventName + useWeb;
        onScroll(event);
      }
    },
    ['onScroll'],
    doDependenciesDiffer
  );

  return <Animated.ScrollView onScroll={customScrollHandler} />;
}

function TestUseHandler2() {
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
        context.eventName = context.eventName
          ? context.eventName + event.eventName + useWeb
          : event.eventName + useWeb;
        // @ts-expect-error Works with `ReanimatedEvent` only.
        onScroll(event);
      }
    },
    ['onScroll'],
    doDependenciesDiffer
  );

  return <Animated.ScrollView onScroll={customScrollHandler} />;
}

function TestUseHandler3() {
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
        context.eventName = context.eventName
          ? context.eventName + event.eventName + useWeb
          : event.eventName + useWeb;
        onScroll(event);
      }
    },
    ['onScroll'],
    doDependenciesDiffer
  );

  return <Animated.ScrollView onScroll={customScrollHandler} />;
}

/**
 * Reanimated 2 Animations
 */

// withTiming
function WithTimingTest() {
  const width = useSharedValue(50);
  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(
        width.value,
        {
          duration: 500,
          easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
        },
        (finished) => {}
      ),
    };
  });
  return (
    <View>
      <Animated.View style={[styles.box, style]} />
      <Button onPress={() => (width.value = Math.random() * 300)} title="Hey" />
    </View>
  );
}

function WithTimingToValueAsColorTest() {
  const style = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        'rgba(255,105,180,0)',
        {
          duration: 500,
          easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
        },
        (_finished) => {}
      ),
    };
  });
  return (
    <View>
      <Animated.View style={[styles.box, style]} />
    </View>
  );
}

// withSpring
function WithSpringTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: { startX: number }) => {
      ctx.startX = x.value;
    },
    onActive: (event, ctx: { startX: number }) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = withSpring(0, {}, (finished) => {});
    },
  });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        },
      ],
    };
  });
  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PanGestureHandler>
  );
}

function WithSpringToValueAsColorTest() {
  const style = useAnimatedStyle(() => {
    return {
      backgroundColor: withSpring('rgba(255,105,180,0)', {}, (_finished) => {}),
    };
  });
  return (
    <View>
      <Animated.View style={[styles.box, style]} />
    </View>
  );
}

// cancelAnimation
function CancelAnimationTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: { startX: number }) => {
      cancelAnimation(x);
    },
    onActive: (event, ctx: { startX: number }) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = 0;
    },
  });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        },
      ],
    };
  });
  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PanGestureHandler>
  );
}

// withDelay
function WithDelayTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
    onStart: (_, _ctx) => {
      cancelAnimation(x);
    },
    onActive: (event, ctx) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = withDelay(1000, withTiming(70));
    },
  });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        },
      ],
    };
  });
  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PanGestureHandler>
  );
}

// withRepeat
function WithRepeatTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
    onStart: (_, _ctx) => {
      cancelAnimation(x);
    },
    onActive: (event, ctx) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = withRepeat(withTiming(70), 1, true, (finished) => {});
    },
  });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        },
      ],
    };
  });
  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PanGestureHandler>
  );
}

// withSequence
function WithSequenceTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
    onStart: (_, _ctx) => {
      cancelAnimation(x);
    },
    onActive: (event, ctx) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = withSequence(withTiming(70), withTiming(70));
    },
  });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        },
      ],
    };
  });
  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PanGestureHandler>
  );
}

// withDecay
function withDecayTest() {
  // @ts-expect-error `rubberBandEffect=true` makes `clamp` required.
  const a = withDecay({ rubberBandEffect: true });

  const b = withDecay({ rubberBandEffect: false });

  const c = withDecay({ rubberBandEffect: true, clamp: [0, 1] });

  // @ts-expect-error `clamp` too short.
  const d = withDecay({ rubberBandEffect: true, clamp: [0] });

  // @ts-expect-error `clamp` too long.
  const e = withDecay({ rubberBandEffect: true, clamp: [0, 1, 2] });

  // @ts-expect-error When `rubberBandEffect` is false then `rubberBandFactor` should not be provided.
  const f = withDecay({ rubberBandEffect: false, rubberBandFactor: 3 });

  // @ts-expect-error When `rubberBandEffect` isn't provided then `rubberBandFactor` should not be provided.
  const f2 = withDecay({ rubberBandFactor: 3 });

  const g = withDecay({
    rubberBandEffect: true,
    clamp: [0, 1],
    rubberBandFactor: 3,
  });

  const rubberBandOn: boolean = Math.random() < 0.5;
  // @ts-expect-error  When `rubberBandEffect` is an unknown boolean user still has to pass clamp.
  const h = withDecay({ rubberBandEffect: rubberBandOn });

  const i = withDecay({ rubberBandEffect: rubberBandOn, clamp: [0, 1] });

  // @ts-expect-error Config is required
  const j = withDecay();

  const k = withDecay({});
}

function WithDecayComponentTest() {
  const x = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: { startX: number }) => {
      ctx.startX = x.value;
    },
    onActive: (event, ctx: { startX: number }) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (evt) => {
      x.value = withDecay({
        velocity: evt.velocityX,
        clamp: [0, 200],
      });
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        },
      ],
    };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PanGestureHandler>
  );
}

// useWorkletCallback
function UseWorkletCallbackTest() {
  const workletCallback = useWorkletCallback((a: number, b: number) => {
    return a + b;
  }, []);

  runOnUI(() => {
    const res = workletCallback(1, 1);

    console.log(res);
  })();

  return <Animated.View style={styles.container} />;
}

// useWorkletCallback
function UseAnimatedReactionTest() {
  const [state, setState] = useState();
  const sv = useSharedValue(0);

  useAnimatedReaction(
    () => {
      return sv.value;
    },
    (value) => {
      console.log(value);
    }
  );

  useAnimatedReaction(
    () => {
      return sv.value;
    },
    (value) => {
      console.log(value);
    },
    []
  );

  useAnimatedReaction(
    () => {
      return sv.value;
    },
    (value) => {
      console.log(value);
    },
    [state]
  );

  useAnimatedReaction(
    () => {
      return sv.value;
    },
    (value, previousResult) => {
      console.log(value, previousResult);
    }
  );

  return null;
}

// interpolateColor
function interpolateColorTest() {
  const sv = useSharedValue(0);

  interpolateColor(sv.value, [0, 1], [0x00ff00, 0x0000ff]);
  interpolateColor(sv.value, [0, 1], ['red', 'blue']);
  interpolateColor(sv.value, [0, 1], ['#00FF00', '#0000FF'], 'RGB');
  interpolateColor(sv.value, [0, 1], ['#FF0000', '#00FF99'], 'HSV');

  return null;
}

// update props
function updatePropsTest() {
  const adapter1 = createAnimatedPropAdapter((props) => {}, []);
  const adapter2 = createAnimatedPropAdapter((props) => {}, ['prop1', 'prop2']);
  const adapter3 = createAnimatedPropAdapter(() => {});

  // @ts-expect-error works only for useAnimatedProps
  useAnimatedStyle(() => ({}), undefined, [adapter1, adapter2, adapter3]);

  // THIS SHOULD BE FIXED SOON
  useAnimatedProps(() => ({}), null, adapter1);

  // THIS SHOULD BE FIXED SOON
  useAnimatedProps(() => ({}), null, [adapter2, adapter3]);
}

/* 
Test Animated Props
*/
function testPartialAnimatedProps1() {
  return (
    <>
      <AnimatedFlatList data={['1']} renderItem={() => null} />;
      <Animated.FlatList data={['1']} renderItem={() => null} />;
    </>
  );
}

function testPartialAnimatedProps2() {
  const optionalProps = useAnimatedProps<FlatListProps<unknown>>(() => ({
    style: {},
  }));
  const requiredProps = useAnimatedProps<FlatListProps<unknown>>(() => ({
    data: ['1'],
    renderItem: () => null,
  }));

  // Should pass because required props are set.
  return (
    <>
      <AnimatedFlatList
        data={['1']}
        renderItem={() => null}
        animatedProps={optionalProps}
      />
      ;
      <Animated.FlatList
        data={['1']}
        renderItem={() => null}
        animatedProps={optionalProps}
      />
      ;
    </>
  );
}

function testPartialAnimatedProps3() {
  const optionalProps = useAnimatedProps<FlatListProps<string>>(() => ({
    style: {},
  }));

  // Shouldn't pass because required props are not set.
  return (
    <>
      {/* @ts-expect-error Correctly detects that required props are not set. */}
      <AnimatedFlatList animatedProps={optionalProps} />
      {/* @ts-expect-error Correctly detects that required props are not set. */}
      <Animated.FlatList animatedProps={optionalProps} />
    </>
  );
}

function testPartialAnimatedProps4() {
  const requiredProps = useAnimatedProps<FlatListProps<string>>(() => ({
    data: ['1'],
    renderItem: () => null,
  }));

  // Should pass because required props are set but fails
  // because AnimatedProps are incorrectly typed.
  return (
    <>
      {/* @ts-expect-error Fails due to bad type. */}
      <AnimatedFlatList animatedProps={requiredProps} />;
      {/* @ts-expect-error Fails due to bad type. */}
      <Animated.FlatList animatedProps={requiredProps} />;
    </>
  );
}

function testPartialAnimatedProps5() {
  const partOfRequiredProps = useAnimatedProps<FlatListProps<string>>(() => ({
    data: ['1'],
  }));

  // Should pass because required props are set but fails
  // because AnimatedProps are incorrectly typed.
  return (
    <>
      <AnimatedFlatList
        renderItem={() => null}
        // @ts-expect-error Fails due to bad type.
        animatedProps={partOfRequiredProps}
      />
      {/* @ts-expect-error Fails due to bad type. */}
      <Animated.FlatList
        animatedProps={partOfRequiredProps}
        renderItem={() => null}
      />
      ;
    </>
  );
}

/* 
    NativeMethods:
  */

// test measure
function testMeasure() {
  const animatedRef = useAnimatedRef<Animated.View>();
  measure(animatedRef);
  const plainRef = useRef<Animated.View>();
  // @ts-expect-error it should only work for Animated refs
  measure(plainRef);
}

// test dispatchCommand
function testDispatchCommand() {
  const animatedRef = useAnimatedRef<Animated.View>();
  dispatchCommand(animatedRef, 'command', [1, 2, 3]);
  const plainRef = useRef<Animated.View>();
  // @ts-expect-error it should only work for Animated refs
  dispatchCommand(plainRef, 'command', [1, 2, 3]);
  // it should work without arguments
  dispatchCommand(animatedRef, 'command');
}

// test scrollTo
function testScrollTo() {
  const animatedRef = useAnimatedRef<Animated.ScrollView>();
  scrollTo(animatedRef, 0, 0, true);
  const plainRef = useRef<Animated.ScrollView>();
  // @ts-expect-error it should only work for Animated refs
  scrollTo(plainRef, 0, 0, true);
  const animatedViewRef = useAnimatedRef<Animated.View>();
}

// test setGestureState
function testSetGestureState() {
  setGestureState(1, 2);
  // not sure what more I can test here
}

/*
  Test Animated style
*/

function TestUseAnimatedStyleStyle1() {
  const sv = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: sv.value,
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle2() {
  const sv = useSharedValue(true);
  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: sv.value,
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle3() {
  const sv = useSharedValue({ width: 0 });
  const animatedStyle = useAnimatedStyle(() => {
    return sv.value;
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle4() {
  const sv = useSharedValue({ width: true });
  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return sv.value;
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle5() {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: 0 }],
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle6() {
  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: 0 }],
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle7() {
  const sv = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: sv.value }],
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle8() {
  const sv = useSharedValue(0);
  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: sv.value }],
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle9() {
  const sv = useSharedValue({ translateX: 0 });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [sv.value],
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle10() {
  const sv = useSharedValue({ rotate: 0 });
  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [sv.value],
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle11() {
  const sv = useSharedValue([{ translateX: 0 }]);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: sv.value,
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle12() {
  const sv = useSharedValue([{ rotate: 0 }]);
  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: sv.value,
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle13() {
  const sv = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      shadowOffset: {
        width: sv.value,
        height: sv.value,
      },
    };
  });

  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle14() {
  const sv = useSharedValue(0);

  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return {
      shadowOffset: {
        width: sv.value,
      },
    };
  });

  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle15() {
  const sv = useSharedValue({ width: 0, height: 0 });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      shadowOffset: sv.value,
    };
  });

  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle16() {
  const sv = useSharedValue({ width: 0 });

  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return {
      shadowOffset: sv.value,
    };
  });

  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle17() {
  const sv = useSharedValue({ shadowOffset: { width: 0, height: 0 } });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      shadowOffset: sv.value.shadowOffset,
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle18() {
  const sv = useSharedValue({ shadowOffset: { width: 0 } });
  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return {
      shadowOffset: sv.value.shadowOffset,
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle19() {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      flexWrap: 'wrap',
    };
  });

  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle20() {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      flexWrap: 'wrap' as const,
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle21() {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      overflow: 'scroll',
    };
  });

  return (
    <>
      <Animated.View style={animatedStyle} />
      {/* @ts-expect-error properly detects illegal type */}
      <Animated.Image source={{ uri: 'uri' }} style={animatedStyle} />
      <Animated.Text style={animatedStyle} />
    </>
  );
}

function TestUseAnimatedStyleStyle22() {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      overflow: 'hidden',
    };
  });
  return (
    <>
      <Animated.View style={animatedStyle} />
      <Animated.Image source={{ uri: 'uri' }} style={animatedStyle} />
      <Animated.Text style={animatedStyle} />
    </>
  );
}

function TestInlineStyles1() {
  const animatedIndex = useSharedValue(0);
  const backgroundColor = useDerivedValue(() => {
    return interpolateColor(
      animatedIndex.value,
      [0, 1, 2],
      ['#273D3A', '#8B645C', '#60545A']
    );
  });
  <Animated.View
    style={{
      flex: 1,
      height: '100%',
      backgroundColor,
    }}
  />;
}

function TestInlineStyles2() {
  const animatedFlex = useSharedValue(0);
  <Animated.View
    style={{
      flex: animatedFlex,
      height: '100%',
    }}
  />;
}

function TestInlineStyles3() {
  const sv = useSharedValue(0);
  return <Animated.View style={{ width: sv }} />;
}

function TestInlineStyles4() {
  const sv = useSharedValue(true);
  // @ts-expect-error properly detects illegal type
  return <Animated.View style={{ width: sv }} />;
}

function TestInlineStyles5() {
  const sv = useSharedValue({ width: 0 });
  return <Animated.View style={sv} />;
}

function TestInlineStyles6() {
  const sv = useSharedValue({ width: true });
  // @ts-expect-error properly detects illegal type
  return <Animated.View style={sv} />;
}

function TestInlineStyles7() {
  const sv = useSharedValue(0);
  return <Animated.View style={{ transform: [{ translateX: sv }] }} />;
}

function TestInlineStyles8() {
  const sv = useSharedValue(0);
  // @ts-expect-error properly detects illegal type
  return <Animated.View style={{ transform: [{ rotate: sv }] }} />;
}

function TestInlineStyles9() {
  const sv = useSharedValue({ translateX: 0 });
  return <Animated.View style={{ transform: [sv] }} />;
}

function TestInlineStyles10() {
  const sv = useSharedValue({ rotate: 0 });
  // @ts-expect-error properly detects illegal type
  return <Animated.View style={{ transform: [sv] }} />;
}

function TestInlineStyles11() {
  const sv = useSharedValue([{ translateX: 0 }]);
  return <Animated.View style={{ transform: sv }} />;
}

function TestInlineStyles12() {
  const sv = useSharedValue([{ rotate: 0 }]);
  // @ts-expect-error properly detects illegal type
  return <Animated.View style={{ transform: sv }} />;
}

function TestInlineStyles13() {
  const sv = useSharedValue({ transform: [{ translateX: 0 }] });
  return <Animated.View style={sv} />;
}

function TestInlineStyles14() {
  const sv = useSharedValue({ transform: [{ rotate: 0 }] });
  // @ts-expect-error properly detects illegal type
  return <Animated.View style={sv} />;
}

function TestInlineStyles15() {
  const sv = useSharedValue(0);

  return (
    <Animated.View
      style={{
        shadowOffset: {
          width: sv.value,
          height: sv.value,
        },
      }}
    />
  );
}

function TestInlineStyles16() {
  const sv = useSharedValue(0);

  return (
    <Animated.View
      // @ts-expect-error properly detects illegal type
      style={{
        shadowOffset: {
          width: sv.value,
        },
      }}
    />
  );
}

function TestInlineStyles17() {
  const sv = useSharedValue({ width: 0, height: 0 });

  return (
    <Animated.View
      style={{
        shadowOffset: sv.value,
      }}
    />
  );
}

function TestInlineStyles18() {
  const sv = useSharedValue({ width: 0 });

  return (
    <Animated.View
      // @ts-expect-error properly detects illegal type
      style={{
        shadowOffset: sv.value,
      }}
    />
  );
}

function TestInlineStyles19() {
  const sv = useSharedValue({ shadowOffset: { width: 0, height: 0 } });
  return <Animated.View style={sv} />;
}

function TestInlineStyles20() {
  const sv = useSharedValue({ shadowOffset: { width: 0 } });
  return (
    <Animated.View
      // @ts-expect-error properly detects illegal type
      style={{
        shadowOffset: sv,
      }}
    />
  );
}

function TestInlineStyles21() {
  return <Animated.View style={{ flexWrap: 'wrap' }} />;
}

function TestInlineStyles22() {
  return <Animated.View style={{ flexWrap: 'wrap' as const }} />;
}

function TestInlineStyles23() {
  return (
    <>
      <Animated.View style={{ overflow: 'scroll' }} />;
      {/* @ts-expect-error properly detects illegal type */}
      <Animated.Image source={{ uri: 'uri' }} style={{ overflow: 'scroll' }} />;
      <Animated.Text style={{ overflow: 'scroll' }} />;
    </>
  );
}

function TestInlineStyles24() {
  return (
    <>
      <Animated.View style={{ overflow: 'hidden' }} />;
      <Animated.Image source={{ uri: 'uri' }} style={{ overflow: 'hidden' }} />;
      <Animated.Text style={{ overflow: 'hidden' }} />;
    </>
  );
}

// test style prop of Animated components

declare const RNStyle: ViewStyle;

function testStyleProps() {
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

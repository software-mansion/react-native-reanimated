/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Ref } from 'react';
import React, { useState, useCallback, forwardRef, useRef } from 'react';
import type {
  FlatListProps,
  ViewProps,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageProps,
} from 'react-native';
import { Button, View, Text, Image, ScrollView, FlatList } from 'react-native';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  Easing,
  withTiming,
  withSpring,
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

function AnimatedFlatListTest() {
  function AnimatedFlatListTest1() {
    type Item = {
      id: number;
    };
    const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const AnimatedTypedFlatList =
      Animated.createAnimatedComponent<FlatListProps<Item[]>>(FlatList);
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
      </>
    );
  }

  function AnimatedFlatListTest2() {
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
  function AnimatedFlatListTest3() {
    const contentContainerStyle: React.ComponentProps<
      Animated.FlatList<unknown>
    >['contentContainerStyle'] = {};
    const newContentContainerStyle = [contentContainerStyle, { flex: 1 }];

    return (
      <Animated.FlatList
        data={[{ foo: 1 }]}
        renderItem={() => null}
        contentContainerStyle={newContentContainerStyle}
      />
    );
  }

  // This tests checks if the type of the contentContainerStyle
  // (or any other '...Style') is treated the same
  // as the style prop of the AnimatedFlatList.
  function AnimatedFlatListTest4() {
    const contentContainerStyle: React.ComponentProps<
      Animated.FlatList<unknown>
    >['style'] = {};
    return (
      <Animated.FlatList
        data={[{ foo: 1 }]}
        renderItem={() => null}
        contentContainerStyle={contentContainerStyle}
      />
    );
  }

  function AnimatedFlatListTestGenericParameter() {
    return (
      <>
        <Animated.FlatList<string> data={['a', 'b']} renderItem={() => null} />
        {/* @ts-expect-error Properly detects wrong generic type */}
        <Animated.FlatList<string> data={[1, 2]} renderItem={() => null} />
      </>
    );
  }
}

function MakeMutableTest() {
  const mut1 = makeMutable(0);
  const mut2 = makeMutable(true);
}

function MakeShareableCloneRecursiveTest() {
  const mut1 = makeShareableCloneRecursive(0);
  const mut2 = makeShareableCloneRecursive(true);
  const mut3 = makeShareableCloneRecursive({ foo: 'bar' });
}

function IsSharedValueTest() {
  const sv = useSharedValue(0);

  isSharedValue(null);
  isSharedValue(undefined);
  isSharedValue(42);
  isSharedValue('foo');
  isSharedValue({ foo: 'bar' });
  isSharedValue(sv);
}

function UseDerivedValueTest() {
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

function UseEventTest() {
  function UseEventTestNativeSyntheticEvent() {
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

    const eventHandler2 = useEvent<RNEvent>(
      (event: ReanimatedEvent<RNEvent>) => {
        event.eventName;
        event.foo;
        // @ts-expect-error Inside parameter of `useEvent` is always `ReanimatedEvent`.
        event.nativeEvent;
      }
    );

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

  function UseEventTestBareEvent() {
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

  function UseEventTestReanimatedEvent() {
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
}

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
}

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
}

function WithTimingTest() {
  function WithTimingTest1() {
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
        <Animated.View style={style} />
        <Button
          onPress={() => (width.value = Math.random() * 300)}
          title="Hey"
        />
      </View>
    );
  }

  function WithTimingTestToValueAsColor() {
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
        <Animated.View style={style} />
      </View>
    );
  }
}

function WithSpringTest() {
  function WithSpringTestToValueAsColor() {
    const style = useAnimatedStyle(() => {
      return {
        backgroundColor: withSpring(
          'rgba(255,105,180,0)',
          {},
          (_finished) => {}
        ),
      };
    });
    return (
      <View>
        <Animated.View style={style} />
      </View>
    );
  }
}

function WithDecayTest() {
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

function UseWorkletCallbackTest() {
  const workletCallback = useWorkletCallback((a: number, b: number) => {
    return a + b;
  }, []);

  runOnUI(() => {
    const res = workletCallback(1, 1);

    console.log(res);
  })();

  return <Animated.View />;
}

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

function InterpolateColorTest() {
  const sv = useSharedValue(0);

  interpolateColor(sv.value, [0, 1], [0x00ff00, 0x0000ff]);
  interpolateColor(sv.value, [0, 1], ['red', 'blue']);
  interpolateColor(sv.value, [0, 1], ['#00FF00', '#0000FF'], 'RGB');
  interpolateColor(sv.value, [0, 1], ['#FF0000', '#00FF99'], 'HSV');

  return null;
}

function UpdatePropsTest() {
  const adapter1 = createAnimatedPropAdapter((props) => {}, []);
  const adapter2 = createAnimatedPropAdapter((props) => {}, ['prop1', 'prop2']);
  const adapter3 = createAnimatedPropAdapter(() => {});

  // @ts-expect-error works only for useAnimatedProps
  useAnimatedStyle(() => ({}), undefined, [adapter1, adapter2, adapter3]);

  useAnimatedProps(() => ({}), null, adapter1);

  useAnimatedProps(() => ({}), null, [adapter2, adapter3]);
}

function UseAnimatedPropsTest() {
  function UseAnimatedPropsTestClass1() {
    class Path extends React.Component<{ fill?: string }> {
      render() {
        return null;
      }
    }
    const AnimatedPath = Animated.createAnimatedComponent(Path);
    const animatedProps = useAnimatedProps(() => ({ fill: 'blue' }));
    return (
      <AnimatedPath
        animatedProps={animatedProps}
        // @ts-expect-error `style` was not defined in `Path`'s props
        style={{ backgroundColor: 'red' }}
      />
    );
  }

  function UseAnimatedPropsTestClass2() {
    class Path extends React.Component<{ fill?: string }> {
      render() {
        return null;
      }
    }
    const AnimatedPath = Animated.createAnimatedComponent(Path);
    const animatedProps = useAnimatedProps(() => ({ fill2: 'blue' }));
    return (
      // @ts-expect-error
      <AnimatedPath animatedProps={animatedProps} />
    );
  }

  function UseAnimatedPropsTestView1() {
    const animatedProps = useAnimatedProps(
      () => ({ pointerEvents: 'none' } as const)
    );
    return <Animated.View animatedProps={animatedProps} />;
  }

  function UseAnimatedPropsTestPartial1() {
    const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
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

  function UseAnimatedPropsTestPartial2() {
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

  function UseAnimatedPropsTestPartial3() {
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

  function UseAnimatedPropsTestPartial4() {
    const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const partOfRequiredProps = useAnimatedProps<FlatListProps<string>>(() => ({
      data: ['1'],
    }));
    // TODO
    // Should pass because required props are set but fails
    // because useAnimatedProps and createAnimatedComponent are incorrectly typed.
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
}

function NativeMethodsTest() {
  function MeasureTest() {
    const animatedRef = useAnimatedRef<Animated.View>();
    measure(animatedRef);
    const plainRef = useRef<Animated.View>();
    // @ts-expect-error it should only work for Animated refs
    measure(plainRef);
  }

  function DispatchCommandTest() {
    const animatedRef = useAnimatedRef<Animated.View>();
    dispatchCommand(animatedRef, 'command', [1, 2, 3]);
    const plainRef = useRef<Animated.View>();
    // @ts-expect-error it should only work for Animated refs
    dispatchCommand(plainRef, 'command', [1, 2, 3]);
    // it should work without arguments
    dispatchCommand(animatedRef, 'command');
  }

  function ScrollToTest() {
    const animatedRef = useAnimatedRef<Animated.ScrollView>();
    scrollTo(animatedRef, 0, 0, true);
    const plainRef = useRef<Animated.ScrollView>();
    // @ts-expect-error it should only work for Animated refs
    scrollTo(plainRef, 0, 0, true);
    const animatedViewRef = useAnimatedRef<Animated.View>();
  }

  function SetGestureStateTest() {
    setGestureState(1, 2);
  }
}

function UseAnimatedStyleTest() {
  function UseAnimatedStyleTest1() {
    const sv = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => {
      return {
        width: sv.value,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest2() {
    const sv = useSharedValue(true);
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        width: sv.value,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest3() {
    const sv = useSharedValue({ width: 0 });
    const animatedStyle = useAnimatedStyle(() => {
      return sv.value;
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest4() {
    const sv = useSharedValue({ width: true });
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return sv.value;
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest5() {
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: 0 }],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest6() {
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ rotate: 0 }],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest7() {
    const sv = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: sv.value }],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest8() {
    const sv = useSharedValue(0);
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ rotate: sv.value }],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest9() {
    const sv = useSharedValue({ translateX: 0 });
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [sv.value],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest10() {
    const sv = useSharedValue({ rotate: 0 });
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [sv.value],
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest11() {
    const sv = useSharedValue([{ translateX: 0 }]);
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: sv.value,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest12() {
    const sv = useSharedValue([{ rotate: 0 }]);
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: sv.value,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest13() {
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

  function UseAnimatedStyleTest14() {
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

  function UseAnimatedStyleTest15() {
    const sv = useSharedValue({ width: 0, height: 0 });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        shadowOffset: sv.value,
      };
    });

    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest16() {
    const sv = useSharedValue({ width: 0 });

    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        shadowOffset: sv.value,
      };
    });

    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest17() {
    const sv = useSharedValue({ shadowOffset: { width: 0, height: 0 } });
    const animatedStyle = useAnimatedStyle(() => {
      return {
        shadowOffset: sv.value.shadowOffset,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest18() {
    const sv = useSharedValue({ shadowOffset: { width: 0 } });
    // @ts-expect-error properly detects illegal type
    const animatedStyle = useAnimatedStyle(() => {
      return {
        shadowOffset: sv.value.shadowOffset,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest19() {
    const animatedStyle = useAnimatedStyle(() => {
      return {
        flexWrap: 'wrap',
      };
    });

    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest20() {
    const animatedStyle = useAnimatedStyle(() => {
      return {
        flexWrap: 'wrap' as const,
      };
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest21() {
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

  function UseAnimatedStyleTest22() {
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

  function UseAnimatedStyleTest23() {
    const animatedStyle = useAnimatedStyle(() => ({
      // @ts-expect-error Passing a number here will work,
      // but we don't allow for it as a part of API.
      backgroundColor: 0x000000,
    }));
  }

  function UseAnimatedStyleTest24() {
    const width = useSharedValue(50);
    // @ts-expect-error since the animated style cannot be an array.
    const animatedStyle = useAnimatedStyle(() => {
      return [{}, { width: width.value }];
    });
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest25() {
    const width = useSharedValue(50);
    // @ts-expect-error since the animated style cannot be "false".
    const animatedStyle = useAnimatedStyle(() => false);
    return <Animated.View style={animatedStyle} />;
  }

  function UseAnimatedStyleTest26() {
    const width = useSharedValue(50);
    // @ts-expect-error since the animated style cannot be a number.
    const animatedStyle = useAnimatedStyle(() => 5);
    return <Animated.View style={animatedStyle} />;
  }
}

function InlineStylesTest() {
  function InlineStylesTest1() {
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

  function InlineStylesTest2() {
    const animatedFlex = useSharedValue(0);
    <Animated.View
      style={{
        flex: animatedFlex,
        height: '100%',
      }}
    />;
  }

  function InlineStylesTest3() {
    const sv = useSharedValue(0);
    return <Animated.View style={{ width: sv }} />;
  }

  function InlineStylesTest4() {
    const sv = useSharedValue(true);
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={{ width: sv }} />;
  }

  function InlineStylesTest5() {
    const sv = useSharedValue({ width: 0 });
    return <Animated.View style={sv} />;
  }

  function InlineStylesTest6() {
    const sv = useSharedValue({ width: true });
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={sv} />;
  }

  function InlineStylesTest7() {
    const sv = useSharedValue(0);
    return <Animated.View style={{ transform: [{ translateX: sv }] }} />;
  }

  function InlineStylesTest8() {
    const sv = useSharedValue(0);
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={{ transform: [{ rotate: sv }] }} />;
  }

  function InlineStylesTest9() {
    const sv = useSharedValue({ translateX: 0 });
    return <Animated.View style={{ transform: [sv] }} />;
  }

  function InlineStylesTest10() {
    const sv = useSharedValue({ rotate: 0 });
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={{ transform: [sv] }} />;
  }

  function InlineStylesTest11() {
    const sv = useSharedValue([{ translateX: 0 }]);
    return <Animated.View style={{ transform: sv }} />;
  }

  function InlineStylesTest12() {
    const sv = useSharedValue([{ rotate: 0 }]);
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={{ transform: sv }} />;
  }

  function InlineStylesTest13() {
    const sv = useSharedValue({ transform: [{ translateX: 0 }] });
    return <Animated.View style={sv} />;
  }

  function InlineStylesTest14() {
    const sv = useSharedValue({ transform: [{ rotate: 0 }] });
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={sv} />;
  }

  function InlineStylesTest15() {
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

  function InlineStylesTest16() {
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

  function InlineStylesTest17() {
    const sv = useSharedValue({ width: 0, height: 0 });

    return (
      <Animated.View
        style={{
          shadowOffset: sv.value,
        }}
      />
    );
  }

  function InlineStylesTest18() {
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

  function InlineStylesTest19() {
    const sv = useSharedValue({ shadowOffset: { width: 0, height: 0 } });
    return <Animated.View style={sv} />;
  }

  function InlineStylesTest20() {
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

  function InlineStylesTest21() {
    return <Animated.View style={{ flexWrap: 'wrap' }} />;
  }

  function InlineStylesTest22() {
    return <Animated.View style={{ flexWrap: 'wrap' as const }} />;
  }

  function InlineStylesTest23() {
    return (
      <>
        <Animated.View style={{ overflow: 'scroll' }} />;
        <Animated.Image
          source={{ uri: 'uri' }}
          // @ts-expect-error properly detects illegal type */
          style={{ overflow: 'scroll' }}
        />
        ;
        <Animated.Text style={{ overflow: 'scroll' }} />;
      </>
    );
  }

  function InlineStylesTest24() {
    return (
      <>
        <Animated.View style={{ overflow: 'hidden' }} />;
        <Animated.Image
          source={{ uri: 'uri' }}
          style={{ overflow: 'hidden' }}
        />
        ;
        <Animated.Text style={{ overflow: 'hidden' }} />;
      </>
    );
  }

  function InlineStylesTest25() {
    // @ts-expect-error Passing a number here will work,
    // but we don't allow for it as a part of API.
    return <Animated.View style={{ backgroundColor: 0x000000 }} />;
  }
}

function AnimatedComponentStylePropTest() {
  const RNStyle: ViewStyle = {};

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
}

function UseAnimatedRefTest() {
  function UseAnimatedRefTestClassComponent() {
    const animatedRef = useAnimatedRef<React.Component<ImageProps>>();
    const AnimatedImage = Animated.createAnimatedComponent(Image);
    return (
      <>
        <AnimatedImage ref={animatedRef} source={{}} />
        <Animated.Image ref={animatedRef} source={{}} />
      </>
    );
  }

  function UseAnimatedRefTestFunctionComponent() {
    const FunctionComponent = (props: ViewProps) => {
      return <View {...props} />;
    };
    const AnimatedFunctionComponent =
      Animated.createAnimatedComponent(FunctionComponent);
    const animatedRef = useAnimatedRef<React.Component<ViewProps>>();
    return (
      <AnimatedFunctionComponent
        // @ts-expect-error ref is not available on plain function-components
        ref={animatedRef}
      />
    );
  }

  function UseAnimatedRefTestForwardRefComponent() {
    const ForwardRefComponent = forwardRef((props: ViewProps) => {
      return <View {...props} />;
    });
    const AnimatedForwardRefComponent =
      Animated.createAnimatedComponent(ForwardRefComponent);
    const animatedRef = useAnimatedRef<React.Component<ViewProps>>();
    return <AnimatedForwardRefComponent ref={animatedRef} />;
  }

  function UseAnimatedRefTestView() {
    const CreatedAnimatedView = Animated.createAnimatedComponent(View);
    const plainRefPlainComponent = useRef<View>(null);
    const animatedRefPlainComponent = useAnimatedRef<View>();
    const plainRefAnimatedComponent = useRef<Animated.View>(null);
    const animatedRefAnimatedComponent = useAnimatedRef<Animated.View>();
    const plainRefCreatedComponent = useRef<typeof CreatedAnimatedView>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedView>();
      useAnimatedRef<typeof CreatedAnimatedView & View>();

    return (
      <>
        <View ref={plainRefPlainComponent} />
        <View ref={animatedRefPlainComponent} />
        <View ref={plainRefAnimatedComponent} />
        <View ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <View ref={plainRefCreatedComponent} />
        <View ref={animatedRefCreatedComponent} />

        <Animated.View ref={plainRefPlainComponent} />
        <Animated.View ref={animatedRefPlainComponent} />
        <Animated.View ref={plainRefAnimatedComponent} />
        <Animated.View ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <Animated.View ref={plainRefCreatedComponent} />
        <Animated.View ref={animatedRefCreatedComponent} />

        <CreatedAnimatedView ref={plainRefPlainComponent} />
        <CreatedAnimatedView ref={animatedRefPlainComponent} />
        <CreatedAnimatedView ref={plainRefAnimatedComponent} />
        <CreatedAnimatedView ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <CreatedAnimatedView ref={plainRefCreatedComponent} />
        <CreatedAnimatedView ref={animatedRefCreatedComponent} />
      </>
    );
  }

  function UseAnimatedRefTestText() {
    const CreatedAnimatedText = Animated.createAnimatedComponent(Text);
    const plainRefPlainComponent = useRef<Text>(null);
    const animatedRefPlainComponent = useAnimatedRef<Text>();
    const plainRefAnimatedComponent = useRef<Animated.Text>(null);
    const animatedRefAnimatedComponent = useAnimatedRef<Animated.Text>();
    const plainRefCreatedComponent = useRef<typeof CreatedAnimatedText>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedText>();
      useAnimatedRef<typeof CreatedAnimatedText & Text>();

    return (
      <>
        <Text ref={plainRefPlainComponent} />
        <Text ref={animatedRefPlainComponent} />
        <Text ref={plainRefAnimatedComponent} />
        <Text ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <Text ref={plainRefCreatedComponent} />
        <Text ref={animatedRefCreatedComponent} />

        <Animated.Text ref={plainRefPlainComponent} />
        <Animated.Text ref={animatedRefPlainComponent} />
        <Animated.Text ref={plainRefAnimatedComponent} />
        <Animated.Text ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref */}
        <Animated.Text ref={plainRefCreatedComponent} />
        <Animated.Text ref={animatedRefCreatedComponent} />

        <CreatedAnimatedText ref={plainRefPlainComponent} />
        <CreatedAnimatedText ref={animatedRefPlainComponent} />
        <CreatedAnimatedText ref={plainRefAnimatedComponent} />
        <CreatedAnimatedText ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <CreatedAnimatedText ref={plainRefCreatedComponent} />
        <CreatedAnimatedText ref={animatedRefCreatedComponent} />
      </>
    );
  }

  function UseAnimatedRefTestImage() {
    const CreatedAnimatedImage = Animated.createAnimatedComponent(Image);
    const plainRefPlainComponent = useRef<Image>(null);
    const animatedRefPlainComponent = useAnimatedRef<Image>();
    const plainRefAnimatedComponent = useRef<Animated.Image>(null);
    const animatedRefAnimatedComponent = useAnimatedRef<Animated.Image>();
    const plainRefCreatedComponent = useRef<typeof CreatedAnimatedImage>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedImage>();
      useAnimatedRef<typeof CreatedAnimatedImage & Image>();

    return (
      <>
        <Image ref={plainRefPlainComponent} source={{ uri: undefined }} />
        <Image ref={animatedRefPlainComponent} source={{ uri: undefined }} />
        <Image ref={plainRefAnimatedComponent} source={{ uri: undefined }} />
        <Image ref={animatedRefAnimatedComponent} source={{ uri: undefined }} />
        {/* @ts-expect-error Properly detects misused type. */}
        <Image ref={plainRefCreatedComponent} source={{ uri: undefined }} />
        <Image ref={animatedRefCreatedComponent} source={{ uri: undefined }} />

        <Animated.Image
          ref={plainRefPlainComponent}
          source={{ uri: undefined }}
        />
        <Animated.Image
          ref={animatedRefPlainComponent}
          source={{ uri: undefined }}
        />
        <Animated.Image
          ref={plainRefAnimatedComponent}
          source={{ uri: undefined }}
        />
        <Animated.Image
          ref={animatedRefAnimatedComponent}
          source={{ uri: undefined }}
        />
        <Animated.Image
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          source={{ uri: undefined }}
        />
        <Animated.Image
          ref={animatedRefCreatedComponent}
          source={{ uri: undefined }}
        />

        <CreatedAnimatedImage
          ref={plainRefPlainComponent}
          source={{ uri: undefined }}
        />
        <CreatedAnimatedImage
          ref={animatedRefPlainComponent}
          source={{ uri: undefined }}
        />
        <CreatedAnimatedImage
          ref={plainRefAnimatedComponent}
          source={{ uri: undefined }}
        />
        <CreatedAnimatedImage
          ref={animatedRefAnimatedComponent}
          source={{ uri: undefined }}
        />
        <CreatedAnimatedImage
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          source={{ uri: undefined }}
        />
        <CreatedAnimatedImage
          ref={animatedRefCreatedComponent}
          source={{ uri: undefined }}
        />
      </>
    );
  }

  function UseAnimatedRefTestScrollView() {
    const CreatedAnimatedScrollView =
      Animated.createAnimatedComponent(ScrollView);
    const plainRefPlainComponent = useRef<ScrollView>(null);
    const animatedRefPlainComponent = useAnimatedRef<ScrollView>();
    const plainRefAnimatedComponent = useRef<Animated.ScrollView>(null);
    const animatedRefAnimatedComponent = useAnimatedRef<Animated.ScrollView>();
    const plainRefCreatedComponent =
      useRef<typeof CreatedAnimatedScrollView>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedScrollView>();
      useAnimatedRef<typeof CreatedAnimatedScrollView & ScrollView>();

    return (
      <>
        <ScrollView ref={plainRefPlainComponent} />
        <ScrollView ref={animatedRefPlainComponent} />
        <ScrollView ref={plainRefAnimatedComponent} />
        <ScrollView ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <ScrollView ref={plainRefCreatedComponent} />
        <ScrollView ref={animatedRefCreatedComponent} />

        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <Animated.ScrollView ref={plainRefPlainComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <Animated.ScrollView ref={animatedRefPlainComponent} />
        <Animated.ScrollView ref={plainRefAnimatedComponent} />
        <Animated.ScrollView ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <Animated.ScrollView ref={plainRefCreatedComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <Animated.ScrollView ref={animatedRefCreatedComponent} />

        <CreatedAnimatedScrollView ref={plainRefPlainComponent} />
        <CreatedAnimatedScrollView ref={animatedRefPlainComponent} />
        <CreatedAnimatedScrollView ref={plainRefAnimatedComponent} />
        <CreatedAnimatedScrollView ref={animatedRefAnimatedComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <CreatedAnimatedScrollView ref={plainRefCreatedComponent} />
        <CreatedAnimatedScrollView ref={animatedRefCreatedComponent} />
      </>
    );
  }

  function UseAnimatedRefTestFlatListNoType() {
    const CreatedAnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const plainRefPlainComponent = useRef<FlatList>(null);
    const animatedRefPlainComponent = useAnimatedRef<FlatList>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plainRefAnimatedComponent = useRef<Animated.FlatList<any>>(null);
    const animatedRefAnimatedComponent =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useAnimatedRef<Animated.FlatList<any>>();
    const plainRefCreatedComponent =
      useRef<typeof CreatedAnimatedFlatList>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedFlatList>();
      useAnimatedRef<typeof CreatedAnimatedFlatList & FlatList>();

    return (
      <>
        <FlatList ref={plainRefPlainComponent} data={[]} renderItem={null} />
        <FlatList ref={animatedRefPlainComponent} data={[]} renderItem={null} />
        <FlatList ref={plainRefAnimatedComponent} data={[]} renderItem={null} />
        <FlatList
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        {/* @ts-expect-error Properly detects misused type. */}
        <FlatList ref={plainRefCreatedComponent} data={[]} renderItem={null} />
        <FlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />

        <Animated.FlatList
          ref={plainRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={plainRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />

        <CreatedAnimatedFlatList
          ref={plainRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={animatedRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={plainRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
      </>
    );
  }

  function UseAnimatedRefTestFlatListWithType() {
    const CreatedAnimatedFlatList = Animated.createAnimatedComponent(
      FlatList<number>
    );
    const plainRefPlainComponent = useRef<FlatList<number>>(null);
    const animatedRefPlainComponent = useAnimatedRef<FlatList<number>>();
    const plainRefAnimatedComponent = useRef<Animated.FlatList<string>>(null);
    const animatedRefAnimatedComponent =
      useAnimatedRef<Animated.FlatList<string>>();
    const plainRefCreatedComponent =
      useRef<typeof CreatedAnimatedFlatList>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedFlatList>();
      useAnimatedRef<typeof CreatedAnimatedFlatList & FlatList<number>>();

    return (
      <>
        <FlatList ref={plainRefPlainComponent} data={[]} renderItem={null} />
        <FlatList ref={animatedRefPlainComponent} data={[]} renderItem={null} />
        <FlatList ref={plainRefAnimatedComponent} data={[]} renderItem={null} />
        <FlatList
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        {/* @ts-expect-error Properly detects misused type. */}
        <FlatList ref={plainRefCreatedComponent} data={[]} renderItem={null} />
        <FlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />

        <Animated.FlatList
          ref={plainRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={plainRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
        <Animated.FlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />

        <CreatedAnimatedFlatList
          ref={plainRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={animatedRefPlainComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          // @ts-expect-error Properly detects misused type.
          ref={animatedRefAnimatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          // @ts-expect-error Properly detects misused Plain Ref.
          ref={plainRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
        <CreatedAnimatedFlatList
          ref={animatedRefCreatedComponent}
          data={[]}
          renderItem={null}
        />
      </>
    );
  }

  function UseAnimatedRefTestCustomClassComponent() {
    interface CustomProps {
      customProp?: string;
      otherProp?: number;
      ref?: Ref<CustomClassComponent>;
    }
    class CustomClassComponent extends React.Component<CustomProps> {
      render() {
        return <View ref={this.props.ref as Ref<View>} />;
      }
    }

    const CreatedAnimatedCustomClassComponent =
      Animated.createAnimatedComponent(CustomClassComponent);
    const plainRefPlainComponent = useRef<CustomClassComponent>(null);
    const animatedRefPlainComponent = useAnimatedRef<CustomClassComponent>();
    const plainRefCreatedComponent =
      useRef<typeof CreatedAnimatedCustomClassComponent>(null);
    const animatedRefCreatedComponent =
      // TODO This below should be the correct syntax I believe, but currently it doesn't work.
      // useAnimatedRef<typeof CreatedAnimatedCustomClassComponent>();
      useAnimatedRef<
        typeof CreatedAnimatedCustomClassComponent & CustomClassComponent
      >();

    return (
      <>
        <CustomClassComponent ref={plainRefPlainComponent} />
        <CustomClassComponent ref={animatedRefPlainComponent} />
        {/* @ts-expect-error Properly detects misused type. */}
        <CustomClassComponent ref={plainRefCreatedComponent} />
        <CustomClassComponent ref={animatedRefCreatedComponent} />

        <CreatedAnimatedCustomClassComponent ref={plainRefPlainComponent} />
        <CreatedAnimatedCustomClassComponent ref={animatedRefPlainComponent} />
        {/* @ts-expect-error Properly detects misused Plain Ref. */}
        <CreatedAnimatedCustomClassComponent ref={plainRefCreatedComponent} />
        <CreatedAnimatedCustomClassComponent
          ref={animatedRefCreatedComponent}
        />
      </>
    );
  }
}

function AnimatedPropsTest() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function AnimatedPropsTestExistence(prop: any) {
    class CustomClassComponent extends React.Component<never> {
      render() {
        return null;
      }
    }
    const AnimatedCustomClassComponent =
      Animated.createAnimatedComponent(CustomClassComponent);

    return (
      <>
        <Animated.View
          entering={prop}
          layout={prop}
          exiting={prop}
          sharedTransitionTag={prop}
          sharedTransitionStyle={prop}
          animatedProps={prop}
        />
        <Animated.Image
          entering={prop}
          layout={prop}
          exiting={prop}
          sharedTransitionTag={prop}
          sharedTransitionStyle={prop}
          animatedProps={prop}
          source={{ uri: undefined }}
        />
        <Animated.Text
          entering={prop}
          layout={prop}
          exiting={prop}
          sharedTransitionTag={prop}
          sharedTransitionStyle={prop}
          animatedProps={prop}
        />
        <Animated.ScrollView
          entering={prop}
          layout={prop}
          exiting={prop}
          sharedTransitionTag={prop}
          sharedTransitionStyle={prop}
          animatedProps={prop}
        />
        <Animated.FlatList
          entering={prop}
          layout={prop}
          exiting={prop}
          sharedTransitionTag={prop}
          sharedTransitionStyle={prop}
          animatedProps={prop}
          data={[]}
          renderItem={() => null}
        />
        <AnimatedCustomClassComponent
          entering={prop}
          layout={prop}
          exiting={prop}
          sharedTransitionTag={prop}
          sharedTransitionStyle={prop}
          animatedProps={prop}
        />
      </>
    );
  }
}

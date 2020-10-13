/* global _WORKLET */
import React from 'react';
import { TextInput, Button, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  useMapper,
  useEvent,
  useAnimatedProps,
  withTiming,
  useAnimatedGestureHandler,
  useAnimatedScrollHandler,
  withDecay,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

const SimpleTest = () => {
  // check if certain hooks work
  const sv = useSharedValue(50);

  useMapper(() => {
    'worklet';
    console.log(`sv has been updated to ${sv.value}`);
  }, [sv]);

  useEvent(
    (event) => {
      'worklet';
      console.log(`event triggered ${event}`);
    },
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent']
  );

  useDerivedValue(() => {
    return sv.value * 2;
  });

  const uas = useAnimatedStyle(() => {
    return {
      width: sv.value * 2,
      height: sv.value,
    };
  });

  const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
  const props = useAnimatedProps(() => {
    return {
      value: 'animated props works ' + sv.value,
    };
  });

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (event, context) => {
      console.log('event started');
    },
    onActive: (event, context) => {
      console.log('event active');
    },
    onEnd: (event, context) => {
      console.log('event end');
    },
    onFail: (event, context) => {
      console.log('event fail');
    },
    onCancel: (event, context) => {
      console.log('event cancel');
    },
    onFinish: (event, context, isFinished) => {
      console.log('event finish');
    },
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      console.log('scroll on scroll');
    },
    onBeginDrag: (e) => {
      console.log('scroll being drag');
    },
    onEndDrag: (e) => {
      console.log('scroll drag end');
    },
    onMomentumBegin: (e) => {
      console.log('scroll momentum begin');
    },
    onMomentumEnd: (e) => {
      console.log('scroll momentum end');
    },
  });

  const updateSV = () => {
    return Math.floor(Math.random() * 100 + 50);
  };

  return (
    <Animated.View>
      <AnimatedTextInput animatedProps={props} style={{ padding: 10 }} />
      <Button
        title="change size(raw)"
        onPress={() => {
          sv.value = updateSV();
        }}
      />
      <Button
        title="change size(with timing)"
        onPress={() => {
          sv.value = withTiming(updateSV(), null, (finished) => {
            // callback may run on UI or on JS
            // 'worklet'
            console.log('timing clb', _WORKLET, finished);
          });
        }}
      />
      <Button
        title="change size(with spring)"
        onPress={() => {
          sv.value = withSpring(updateSV(), null, (finished) => {
            // callback may run on UI or on JS
            // 'worklet'
            console.log('spring clb', _WORKLET, finished);
          });
        }}
      />
      <Button
        title="change size(with decay)"
        onPress={() => {
          sv.value = withDecay(
            {
              velocity: Math.floor(Math.random() * 100 - 50),
            },
            (finished) => {
              // callback may run on UI or on JS
              // 'worklet'
              console.log('decay clb', _WORKLET, finished);
            }
          );
        }}
      />
      <Button
        title="change size(with delay)"
        onPress={() => {
          sv.value = withDelay(
            1000,
            withTiming(updateSV(), { duration: 0 }, (finished) => {
              // callback may run on UI or on JS
              // 'worklet'
              console.log('delayed timing clb', _WORKLET, finished);
            })
          );
        }}
      />
      <Button
        title="change size(with sequence)"
        onPress={() => {
          sv.value = withSequence(
            withTiming(updateSV(), { duration: 500 }, (finished) => {
              // callback may run on UI or on JS
              // 'worklet'
              console.log('sequenced timing clb 1', _WORKLET, finished);
            }),
            withTiming(updateSV(), { duration: 500 }, (finished) => {
              // callback may run on UI or on JS
              // 'worklet'
              console.log('sequenced timing clb 2', _WORKLET, finished);
            }),
            withTiming(updateSV(), { duration: 500 }, (finished) => {
              // callback may run on UI or on JS
              // 'worklet'
              console.log('sequenced timing clb 3', _WORKLET, finished);
            })
          );
        }}
      />
      <Button
        title="change size(with repeat)"
        onPress={() => {
          sv.value = withRepeat(
            withTiming(updateSV(), { duration: 500 }, (finished) => {
              // callback may run on UI or on JS
              // 'worklet'
              console.log('repeated timing clb', _WORKLET, finished);
            }),
            4,
            true,
            (finished) => {
              // callback may run on UI or on JS
              // 'worklet'
              console.log('repeat clb final', _WORKLET, finished);
            }
          );
        }}
      />
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[{ backgroundColor: 'green' }, uas]} />
      </PanGestureHandler>

      <Animated.ScrollView
        style={{ backgroundColor: 'yellow' }}
        scrollEventThrottle={1}
        onScroll={scrollHandler}>
        <View style={{ width: 25, height: 25, backgroundColor: 'black' }} />
        <View style={{ width: 25, height: 25, backgroundColor: 'black' }} />
        <View style={{ width: 25, height: 25, backgroundColor: 'black' }} />
        <View style={{ width: 25, height: 25, backgroundColor: 'black' }} />
        <View style={{ width: 25, height: 25, backgroundColor: 'black' }} />
      </Animated.ScrollView>
    </Animated.View>
  );
};

export default SimpleTest;

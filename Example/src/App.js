import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

export default function Playground() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = 1;
  }, [opacity]);

  const style = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      <Animated.Text style={style}>Hello</Animated.Text>
    </View>
  );
}import {default as React, useEffect, useState} from 'react';
import {Button, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const Inner = () => {
  const val = useSharedValue(0);

  useEffect(() => {
    val.value = withTiming(100, {
      duration: 10000,
    });
  }, [val]);

  const style = useAnimatedStyle(() => {
    return {
      fontSize: val.value,
    };
  });

  return (
    <Animated.View
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
      }}
    >
      <View style={{height: 100}}>
        <Animated.Text style={style}>HIII</Animated.Text>
      </View>
      <Button title="is UI still responsive?" onPress={() => alert('Yes')} />
    </Animated.View>
  );
};

let i = 0;

export const ReanimatedBugReport = () => {
  const [updates, setUpdates] = useState(() => Date.now());

  useEffect(() => {
    setInterval(() => {
      setUpdates(Date.now());
    }, 100);
  }, []);
  console.log('rerendering', i++);

  return <Inner key={updates} />;
};

export const AppEntryPoint = () => {
  return <ReanimatedBugReport />;
};

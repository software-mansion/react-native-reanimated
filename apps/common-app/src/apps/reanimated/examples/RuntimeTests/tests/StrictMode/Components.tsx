import { StrictMode, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export function AssignValueExample() {
  const width = useSharedValue(100);
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(width.value),
  }));
  useEffect(() => {
    width.value = 200;
  }, [width]);

  return (
    <StrictMode>
      <Animated.View style={[{ height: 100, backgroundColor: 'green' }, animatedStyle]} />
    </StrictMode>
  );
}

export function AssignAnimationExample() {
  const width = useSharedValue(100);
  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));
  useEffect(() => {
    width.value = withTiming(200);
  }, [width]);

  return (
    <StrictMode>
      <Animated.View style={[{ height: 100, backgroundColor: 'green' }, animatedStyle]} />
    </StrictMode>
  );
}

const defaultStyle = { width: 100, height: 100, backgroundColor: 'orange' };

export function EnteringExample() {
  return (
    <StrictMode>
      <Animated.View entering={FadeIn} style={defaultStyle} />
    </StrictMode>
  );
}

export function LayoutExample() {
  const [toggle, setToggle] = useState(false);
  useEffect(() => {
    setToggle(true);
  }, []);

  return (
    <StrictMode>
      {toggle && <View style={defaultStyle} />}
      <Animated.View layout={LinearTransition} style={defaultStyle} />
    </StrictMode>
  );
}

export function ExitingExample() {
  const [toggle, setToggle] = useState(true);
  useEffect(() => {
    setToggle(false);
  }, []);

  return <StrictMode>{toggle && <Animated.View exiting={FadeOut} style={defaultStyle} />}</StrictMode>;
}

import React from "react";
import {
  Dimensions,
  PixelRatio,
  StyleSheet,
  View,
  processColor,
} from "react-native";
import Animated, {
  useSharedValue,
  useDerivedValue,
  interpolate,
  useAnimatedGestureHandler,
  useAnimatedStyle
} from "react-native-reanimated";

import { canvas2Polar, polar2Canvas } from "./Coordinates";
import { PanGestureHandler } from "react-native-gesture-handler";

const { width } = Dimensions.get("window");
const size = width - 32;
const STROKE_WIDTH = 40;
const r = PixelRatio.roundToNearestPixel(size / 2);
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: r * 2,
    height: r * 2,
  },
});

const CircularSlider = () => {
  const theta = useSharedValue(0);
  const onGestureEvent = useAnimatedGestureHandler({
    onActive: (event, ctx) => {
      theta.value = canvas2Polar({ x: event.translationX, y: event.translationY }, { x: r, y: r }).theta;
    }
  });
  const style = useAnimatedStyle(() => {
    const {x: translateX, y: translateY } = polar2Canvas({ theta: theta.value, radius: r }, { x: r, y: r});
    return {
      transform: [{ translateX }, { translateY }]
    }
  });
  return (
    <PanGestureHandler {...{onGestureEvent}}>
      <Animated.View style={[{ width: 200, height: 200, backgroundColor: "cyan" }, style]} />
    </PanGestureHandler>
  );
};

export default CircularSlider;

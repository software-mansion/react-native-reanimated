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
} from "react-native-reanimated";

import Test from "./Test";

import { canvas2Polar } from "./Coordinates";

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
  const theta = useSharedValue(canvas2Polar({ x: 0, y: 0 }, { x: r, y: r }).theta);
  return (
    <Test />
  );
};

export default CircularSlider;

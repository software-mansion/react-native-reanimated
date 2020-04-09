import React from "react";
import { Dimensions } from "react-native";
import Animated from "react-native-reanimated";
import { Feather as Icon } from "@expo/vector-icons";

const { sub, interpolate, Extrapolate } = Animated;
const { width } = Dimensions.get("window");
const size = 50;
interface ButtonProps {
  progress: Animated.Node<number>;
  y: Animated.Node<number>;
}

export default ({ progress, y }: ButtonProps) => {
  const translateX = interpolate(progress, {
    inputRange: [0, 0.4],
    outputRange: [width - size - 8, 0]
  });
  const translateY = sub(y, size / 2);
  const opacity = interpolate(progress, {
    inputRange: [0, 0.1],
    outputRange: [1, 0],
    extrapolate: Extrapolate.CLAMP
  });
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: "center",
        alignItems: "center",
        transform: [{ translateX }, { translateY }],
        opacity
      }}
    >
      <Icon name="chevron-left" color="black" size={40} />
    </Animated.View>
  );
};

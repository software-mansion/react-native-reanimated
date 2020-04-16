import React from "react";
import { Dimensions, Text } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
//import { Feather as Icon } from "@expo/vector-icons";

const { sub, interpolate, Extrapolate } = Animated;
const { width } = Dimensions.get("window");
const size = 50;

export default ({ progress, y }) => {
  const style = useAnimatedStyle(
    function(input) {
      'worklet';
      const { progress, y, size, width } = input;

      const interpolate = (l, r, ll, rr, clamp) => {
        const coef = (l-progress.value)/(r-l);
        const ans = ll + (rr-ll) * coef;
        if (clamp && (ans > Math.max(ll, rr))) return Math.max(ll, rr);
        if (clamp && (ans < Math.min(ll, rr))) return Math.min(ll, rr);
        return ans;
      }

      return {
        opacity: interpolate(0, 0.1, 1, 0, true),
        trasform: [
          {
            translateX: interpolate(0, 0.4, width.value - size.value - 8, 0, false),
          },
          {
            translateY: y.value - size.value / 2,
          }
        ],
      }
    }, { progress, y, size, width }
  );

  return (
    <Animated.View
      style={[{
        position: "absolute",
        top: 0,
        left: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: "center",
        alignItems: "center",
      }, style]}
    >
      {/*<Icon name="chevron-left" color="black" size={40} />*/}
    </Animated.View>
  );
};

import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, { useSharedValue, useEventWorklet, useSpring } from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";
import Weave from "./Weave";
import { useSnapProgress } from "./AnimationHelpers";
import {
  initialSideWidth,
  initialWaveCenter,
} from "./WeaveHelpers";
import Content from "./Content";
import Button from "./Button";

export const assets = [
  require("./assets/firstPageImage.png"),
  require("./assets/secondPageImage.png")
];

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

export default () => {
  const y = useSharedValue(initialWaveCenter);
  const isBack = useSharedValue(0);
  const state = useSharedValue(0);
  const gestureProgress = useSharedValue(0);
  const maxDist = useSharedValue(width - initialSideWidth);
  const snapPoint = useSharedValue(0);
  const centerY = useSharedValue(0);
  const spring = useSpring({},{});

  const handler = useEventWorklet(
    function(gestureProgress, isBack, y, state, maxDist, snapPoint, spring, centerY) {
      'worklet';
      state.set(this.event.state);
      y.set(this.event.y);
      let { velocityX , translationX } = this.event;

      const interpolate = (l, r, ll, rr) => {
        const progress = translationX/(r-l);
        return ll + (rr-ll) * progress;
      }

      if (isBack.value) {
        gestureProgress.set(interpolate(0, maxDist.value, 1, 0));
      } else {
        gestureProgress.set(interpolate(-maxDist.value, 0, 0.4, 0));
      }

      // snapPoint
      velocityX = (-velocityX)/(isBack.value * maxDist.value + (1-isBack.value) * 0.4 * maxDist.value);
      const point = gestureProgress.value + 0.2 * velocityX;
      const diff0 = Math.abs(point);
      const diff1 = Math.abs(point - 1);
      if (diff0 < diff1) {
        snapPoint.set(0);
      } else {
        snapPoint.set(1);
      }
      // centerY
      centerY.set(Reanimated.withWorklet(spring.worklet, [{}, {toValue: y.value}]));
    }, [gestureProgress, isBack, y, state, maxDist, snapPoint, spring, centerY]
  );

  const progress = useSnapProgress(gestureProgress, state, isBack, snapPoint);

  return (
    <View style={styles.container}>
      <Content
        backgroundColor="white"
        source={assets[0]}
        title1="Online"
        title2="Gambling"
        color="black"
      />
      <PanGestureHandler onGestureEvent={handler} onHandlerStateChange={handler} >
        <Animated.View style={StyleSheet.absoluteFill}>
          <Weave {...{progress, isBack}}>
            <Content
              backgroundColor="#4d1168"
              source={assets[1]}
              title1="For"
              title2="Gamers"
              color="#fd5587"
            />
          </Weave>
          <Button y={centerY} {...{ progress }} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

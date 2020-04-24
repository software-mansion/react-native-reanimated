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
  const isBack = useSharedValue(0);
  const state = useSharedValue(0);
  const gestureProgress = useSharedValue(0);
  const maxDist = useSharedValue(width - initialSideWidth);
  const snapPoint = useSharedValue(0);
  const centerY = useSharedValue(initialWaveCenter);
  const spring = useSpring({},{});

  const handler = useEventWorklet(
    function(gestureProgress, isBack, state, maxDist, snapPoint, spring, centerY) {
      'worklet';
      let { velocityX, translationX, y } = this.event;
      state.set(this.event.state);

      if (isBack.value === 1) {
        gestureProgress.set(Reanimated.interpolate(translationX, 0, maxDist.value, 1, 0));
      } else {
        gestureProgress.set(Reanimated.interpolate(translationX, -maxDist.value, 0, 0.4, 0));
      }
      
      // snapPoint
      velocityX = (-velocityX)/(isBack.value * maxDist.value + (1-isBack.value) * 0.4 * maxDist.value);
      const point = gestureProgress.value + 0.2 * velocityX;
      snapPoint.set(Reanimated.clamp(point,[0, 1]));
      // centerY
      centerY.set(Reanimated.withWorklet(spring.worklet, [{}, {toValue: y}])); 
    }, [gestureProgress, isBack, state, maxDist, snapPoint, spring, centerY]
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
          <Weave {...{progress, centerY, isBack}}>
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

import React from 'react';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useEventWorklet,
  useSharedValue,
  useWorklet,
} from 'react-native-reanimated';

import { alpha, perspective } from './Constants';
import Content, { width } from './Content';

const MIN = -width * Math.tan(alpha);
const MAX = 0;
const PADDING = 100;

export default ({ hideTarget, hideWorklet, scale, rotateY, translateX }) => {
  const totalTranslation = useSharedValue(0);
  const extraRotate = useSharedValue('0deg');
  const extraTranslate = useSharedValue(0);

  const animateWorklet = useWorklet(
    function(totalTranslation, extraRotate, extraTranslate) {
      'worklet';
      let translationX = totalTranslation.value;
      const sign = translationX < 0 ? -1 : 1;

      const x = translationX;
      const dt = 1 / 60; // would be nice to be provided with dt when worklet is used as a looper
      const tension = 300;
      const damping = 12;
      const acc = -tension * x;

      let V = dt * acc;
      V = V + dt * -damping * V;

      translationX = translationX + V * dt;

      if (Math.abs(translationX) < 0.2) {
        translationX = 0;
      }
      totalTranslation.set(translationX);

      const extraNorm = Math.min(translationX * sign, 100) / 100;
      const extraProgress = extraNorm * sign;

      extraRotate.set(extraProgress * -30 + 'deg');
      extraTranslate.set(extraProgress * 24);

      if (translationX === 0) {
        // would be easier if we could call stop, I already checked earlier
        // for the end of animation and now I have to add it again
        return true;
      }
    },
    [totalTranslation, extraRotate, extraTranslate]
  );

  const eventWorklet = useEventWorklet(
    function(
      totalTranslation,
      extraRotate,
      extraTranslate,
      animateWorklet,
      hideTarget,
      hideWorklet
    ) {
      'worklet';
      let translationX = this.event.translationX + totalTranslation.value;
      if (this.event.state === 2) {
        // for animation it'd be convinient to have a way to define a logic that runs
        // when it gets interrupted (ended or cancelled).
        animateWorklet.stop();
      } else if (this.event.state === 5) {
        totalTranslation.set(translationX);
        if (translationX < -30) {
          console.log('FINAL TRANSLATION ' + translationX);
          // we need to paste hide logic here, would be nice to be able to use function
          // maybe "worklet" should just be a "function" and when we want to use
          // it to drive animation we can use some "looper" abstraction?
          hideTarget.set(0);
          hideWorklet.start();
        }
        // would be nice to be able to call worklet.start like we do  in JS thread
        animateWorklet.start();
      }

      const sign = translationX < 0 ? -1 : 1;
      const extraNorm = Math.min(translationX * sign, 100) / 100;
      const extraProgress = Math.sqrt(extraNorm) * sign;

      // the logic of updating rotation and translate needs to be copied in two
      // places, we could've used Anmated.interpolate to avoid that and only update
      // "progress"
      extraRotate.set(extraProgress * -30 + 'deg');
      extraTranslate.set(extraProgress * 24);
    },
    [
      totalTranslation,
      extraRotate,
      extraTranslate,
      animateWorklet,
      hideTarget,
      hideWorklet,
    ]
  );

  return (
    <PanGestureHandler
      minDist={0}
      onGestureEvent={eventWorklet}
      onHandlerStateChange={eventWorklet}>
      <Animated.View
        style={{
          opacity: 1,
          transform: [
            perspective,
            { translateX },
            { translateX: extraTranslate },
            { translateX: -width / 2 },
            { rotateY },
            { rotateY: extraRotate },
            { translateX: width / 2 },
            { scale },
          ],
        }}>
        <Content />
      </Animated.View>
    </PanGestureHandler>
  );
};

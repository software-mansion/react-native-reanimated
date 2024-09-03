import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeInDown,
  FadeOutLeft,
  FadeOutRight,
  FadeOutUp,
  FadeOutDown,
  FlipInEasyY,
  FlipInXDown,
  FlipInEasyX,
  FlipInXUp,
  FlipInYLeft,
  FlipInYRight,
  LightSpeedInLeft,
  LightSpeedInRight,
  PinwheelIn,
  RollInRight,
  RollInLeft,
  RotateInDownLeft,
  RotateInDownRight,
  RotateInUpLeft,
  RotateInUpRight,
  FlipOutEasyX,
  FlipOutEasyY,
  FlipOutXDown,
  FlipOutXUp,
  FlipOutYLeft,
  FlipOutYRight,
  LightSpeedOutRight,
  LightSpeedOutLeft,
  PinwheelOut,
  RollOutRight,
  RollOutLeft,
  RotateOutDownLeft,
  RotateOutDownRight,
  RotateOutUpLeft,
  RotateOutUpRight,
  SlideInRight,
  SlideInLeft,
  SlideInUp,
  SlideInDown,
  SlideOutLeft,
  SlideOutRight,
  SlideOutUp,
  SlideOutDown,
  StretchInX,
  StretchInY,
  StretchOutX,
  StretchOutY,
  BounceOut,
  BounceOutRight,
  BounceOutLeft,
  BounceOutUp,
  BounceOutDown,
  BounceIn,
  BounceInRight,
  BounceInLeft,
  BounceInUp,
  BounceInDown,
} from 'react-native-reanimated';
import { EnteringExitingConfigProps } from '.';

interface ExampleProps {
  entering: EnteringExitingConfigProps;
  exiting: EnteringExitingConfigProps;
}

export const ENTERING_ANIMATIONS = {
  // Fade
  FadeIn: FadeIn,
  FadeInLeft: FadeInLeft,
  FadeInRight: FadeInRight,
  FadeInUp: FadeInUp,
  FadeInDown: FadeInDown,

  // Bounce
  BounceIn: BounceIn,
  BounceInRight: BounceInRight,
  BounceInLeft: BounceInLeft,
  BounceInUp: BounceInUp,
  BounceInDown: BounceInDown,

  // Flip
  FlipInEasyX: FlipInEasyX,
  FlipInEasyY: FlipInEasyY,
  FlipInXDown: FlipInXDown,
  FlipInXUp: FlipInXUp,
  FlipInYLeft: FlipInYLeft,
  FlipInYRight: FlipInYRight,

  // LightSpeed
  LightSpeedInRight: LightSpeedInRight,
  LightSpeedInLeft: LightSpeedInLeft,

  // Pinwheel
  PinwheelIn: PinwheelIn,

  // Roll
  RollInRight: RollInRight,
  RollInLeft: RollInLeft,

  // Rotate
  RotateInDownLeft: RotateInDownLeft,
  RotateInDownRight: RotateInDownRight,
  RotateInUpLeft: RotateInUpLeft,
  RotateInUpRight: RotateInUpRight,

  // Slide
  SlideInRight: SlideInRight,
  SlideInLeft: SlideInLeft,
  SlideInUp: SlideInUp,
  SlideInDown: SlideInDown,

  // Stretch
  StretchInX: StretchInX,
  StretchInY: StretchInY,
};

export const EXITING_ANIMATIONS = {
  // Fade
  FadeOut: FadeOut,
  FadeOutLeft: FadeOutLeft,
  FadeOutRight: FadeOutRight,
  FadeOutUp: FadeOutUp,
  FadeOutDown: FadeOutDown,

  // Bounce
  BounceOut: BounceOut,
  BounceOutRight: BounceOutRight,
  BounceOutLeft: BounceOutLeft,
  BounceOutUp: BounceOutUp,
  BounceOutDown: BounceOutDown,

  // Flip
  FlipOutEasyX: FlipOutEasyX,
  FlipOutEasyY: FlipOutEasyY,
  FlipOutXDown: FlipOutXDown,
  FlipOutXUp: FlipOutXUp,
  FlipOutYLeft: FlipOutYLeft,
  FlipOutYRight: FlipOutYRight,

  // LightSpeed
  LightSpeedOutRight: LightSpeedOutRight,
  LightSpeedOutLeft: LightSpeedOutLeft,

  // Pinwheel
  PinwheelOut: PinwheelOut,

  // Roll
  RollOutRight: RollOutRight,
  RollOutLeft: RollOutLeft,

  // Rotate
  RotateOutDownLeft: RotateOutDownLeft,
  RotateOutDownRight: RotateOutDownRight,
  RotateOutUpLeft: RotateOutUpLeft,
  RotateOutUpRight: RotateOutUpRight,

  // Slide
  SlideOutRight: SlideOutRight,
  SlideOutLeft: SlideOutLeft,
  SlideOutUp: SlideOutUp,
  SlideOutDown: SlideOutDown,

  // Stretch
  StretchOutX: StretchOutX,
  StretchOutY: StretchOutY,
};

export default function Example({ entering, exiting }: ExampleProps) {
  const [visible, setVisible] = React.useState(true);

  const getEnteringAnimation = () => {
    const {
      animation,
      easing,
      duration,
      delay,
      isSpringBased,
      mass,
      stiffness,
      damping,
      overshootClamping,
      restSpeedThreshold,
      restDisplacementThreshold,
    } = entering;

    return !isSpringBased
      ? ENTERING_ANIMATIONS[animation]
          .duration(duration)
          .delay(delay)
          .easing(easing)
      : ENTERING_ANIMATIONS[animation]
          .delay(delay)
          .springify()
          .damping(damping)
          .mass(mass)
          .overshootClamping(overshootClamping)
          .restSpeedThreshold(restSpeedThreshold)
          .restDisplacementThreshold(restDisplacementThreshold)
          .stiffness(stiffness);
  };

  const getExitingAnimation = () => {
    const {
      animation,
      easing,
      delay,
      duration,
      isSpringBased,
      mass,
      stiffness,
      damping,
      overshootClamping,
      restSpeedThreshold,
      restDisplacementThreshold,
    } = exiting;

    return !isSpringBased
      ? EXITING_ANIMATIONS[animation]
          .duration(duration)
          .delay(delay)
          .easing(easing)
      : EXITING_ANIMATIONS[animation]
          .springify()
          .delay(delay)
          .damping(damping)
          .mass(mass)
          .overshootClamping(overshootClamping)
          .restSpeedThreshold(restSpeedThreshold)
          .restDisplacementThreshold(restDisplacementThreshold)
          .stiffness(stiffness);
  };

  return (
    <View style={styles.container}>
      <Button title="Toggle View" onPress={() => setVisible((prev) => !prev)} />
      {visible && (
        <Animated.View
          entering={getEnteringAnimation()}
          exiting={getExitingAnimation()}
          style={styles.box}></Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    marginTop: 32,
    minHeight: 200,
  },
  box: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#b58df1',
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

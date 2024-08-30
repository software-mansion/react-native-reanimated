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
};

export const EXITING_ANIMATIONS = {
  // Fade
  FadeOut: FadeOut,
  FadeOutLeft: FadeOutLeft,
  FadeOutRight: FadeOutRight,
  FadeOutUp: FadeOutUp,
  FadeOutDown: FadeOutDown,

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
};

export default function Example({ entering, exiting }: ExampleProps) {
  const [visible, setVisible] = React.useState(true);

  const getEnteringAnimation = () => {
    const {
      animation,
      easing,
      duration,
      isSpringBased,
      mass,
      stiffness,
      damping,
      overshootClamping,
      restSpeedThreshold,
      restDisplacementThreshold,
    } = entering;

    return isSpringBased
      ? ENTERING_ANIMATIONS[animation].duration(duration).easing(easing)
      : ENTERING_ANIMATIONS[animation]
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
      duration,
      isSpringBased,
      mass,
      stiffness,
      damping,
      overshootClamping,
      restSpeedThreshold,
      restDisplacementThreshold,
    } = exiting;

    return isSpringBased
      ? EXITING_ANIMATIONS[animation].duration(duration).easing(easing)
      : EXITING_ANIMATIONS[animation]
          .springify()
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

import React, { useEffect, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  Easing,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

export function useStartupAnimation() {
  const [hasLoadingFinished, setHasLoadingFinished] = useState<boolean>(false);
  const [hasEntryAnimationFinished, setHasEntryAnimationFinished] =
    useState<boolean>(false);
  const [hasExitAnimationFinished, setHasExitAnimationFinished] =
    useState<boolean>(false);

  const isUnmounting = hasLoadingFinished && hasEntryAnimationFinished;

  const animationProgressController = useSharedValue(0);

  const animatedProps = useAnimatedProps(() => ({
    progress: animationProgressController.value,
  }));

  useEffect(() => {
    setTimeout(() => {
      setHasLoadingFinished(true);
    }, 10_000);
  }, []);

  useEffect(() => {
    if (hasExitAnimationFinished) {
      console.log('FINISHED ANIMATION');
    }
  }, [hasExitAnimationFinished]);

  useEffect(() => {
    animationProgressController.value = withTiming(
      0.61,
      {
        duration: 1500,
        easing: Easing.linear,
      },
      (hasFinished) =>
        hasFinished && runOnJS(setHasEntryAnimationFinished)(hasFinished)
    );
  }, [animationProgressController, setHasEntryAnimationFinished]);

  useEffect(() => {
    if (isUnmounting) {
      animationProgressController.value = withTiming(
        1,
        {
          duration: 750,
          easing: Easing.linear,
        },
        (hasFinished) =>
          hasFinished && runOnJS(setHasExitAnimationFinished)(hasFinished)
      );
    }
  }, [animationProgressController, isUnmounting, setHasExitAnimationFinished]);

  return {
    animatedProps,
    isUnmounting,
    setHasEntryAnimationFinished,
  };
}

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

export default function App() {
  const { animatedProps } = useStartupAnimation();

  return (
    <AnimatedLottieView
      animatedProps={animatedProps}
      source={require('./assets/LottieLogo1.json')}
      resizeMode={'cover'}
      autoPlay={false}
      loop={false}
    />
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { View } from 'react-native';

import Animated, {
  BounceIn,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOut,
  FadeOutDown,
  FlipInXUp,
  LightSpeedInRight,
  PinwheelIn,
  RollInLeft,
  RotateInDownLeft,
  SlideInRight,
  StretchInX,
  ZoomIn,
  ZoomInRotate,
} from '../..';

function LayoutAnimationsTest() {
  function LayoutAnimationsWithInitialValues() {
    const fadeInWithOpacity = FadeIn.withInitialValues({ opacity: 0.5 });

    const fadeOutWithOpacity = FadeOut.withInitialValues({ opacity: 0.2 });

    const fadeInRightWithOpacityAndTranslate = FadeInRight.withInitialValues({
      opacity: 0.5,
      transform: [{ translateX: 50 }],
    });

    const fadeInRightWithPercentTranslate = FadeInRight.withInitialValues({
      transform: [{ translateX: '50%' }],
    });

    const fadeInDownWithOpacityAndTranslate = FadeInDown.withInitialValues({
      opacity: 0.1,
      transform: [{ translateY: 100 }],
    });

    const fadeOutDownWithPercentTranslate = FadeOutDown.withInitialValues({
      transform: [{ translateY: '25%' }],
    });

    const bounceInWithScale = BounceIn.withInitialValues({
      transform: [{ scale: 0.25 }],
    });

    const zoomInWithScale = ZoomIn.withInitialValues({
      transform: [{ scale: 0.5 }],
    });

    const zoomInRotateWithScaleAndRotate = ZoomInRotate.withInitialValues({
      transform: [{ scale: 0 }, { rotate: '45deg' }],
    });

    const flipInXUpWithFullTransform = FlipInXUp.withInitialValues({
      transform: [
        { perspective: 1000 },
        { rotateX: '90deg' },
        { translateY: -100 },
      ],
    });

    const lightSpeedInRightWithOpacityAndTransform =
      LightSpeedInRight.withInitialValues({
        opacity: 0,
        transform: [{ translateX: 200 }, { skewX: '-45deg' }],
      });

    const pinwheelInWithOpacityAndTransform = PinwheelIn.withInitialValues({
      opacity: 0,
      transform: [{ scale: 0 }, { rotate: '5rad' }],
    });

    const rollInLeftWithTransform = RollInLeft.withInitialValues({
      transform: [{ translateX: -200 }, { rotate: '-180deg' }],
    });

    const rotateInDownLeftWithOpacityAndTransform =
      RotateInDownLeft.withInitialValues({
        opacity: 0,
        transform: [
          { rotate: '-90deg' },
          { translateX: 10 },
          { translateY: -10 },
        ],
      });

    const slideInRightWithOriginX = SlideInRight.withInitialValues({
      originX: 100,
    });

    const stretchInXWithScaleX = StretchInX.withInitialValues({
      transform: [{ scaleX: 0 }],
    });

    // Partial overrides should be allowed.
    const fadeInRightWithOnlyOpacity = FadeInRight.withInitialValues({
      opacity: 0.2,
    });

    const fadeInRightWithOnlyTransform = FadeInRight.withInitialValues({
      transform: [{ translateX: 10 }],
    });

    // Should be chainable with other modifiers.
    const fadeInChained = FadeIn.duration(300)
      .withInitialValues({ opacity: 0.2 })
      .delay(100);
  }

  function LayoutAnimationsWithInitialValuesRejectsTest() {
    FadeIn.withInitialValues({
      // @ts-expect-error opacity must be a number, not a string.
      opacity: 'red',
    });

    FadeIn.withInitialValues({
      // @ts-expect-error FadeIn has no transform in its initial values.
      transform: [{ translateX: 0 }],
    });

    FadeIn.withInitialValues({
      // @ts-expect-error Unknown property `color`.
      color: 'red',
    });

    FadeInRight.withInitialValues({
      transform: [
        {
          // @ts-expect-error FadeInRight expects `translateX`, not `translateY`.
          translateY: 50,
        },
      ],
    });

    FadeInRight.withInitialValues({
      transform: [
        {
          // @ts-expect-error `translateX` does not accept arbitrary strings (only number or `${number}%`).
          translateX: 'left',
        },
      ],
    });

    FlipInXUp.withInitialValues({
      // @ts-expect-error FlipInXUp expects a tuple of 3 transforms, not 2.
      transform: [{ perspective: 500 }, { rotateX: '90deg' }],
    });

    // prettier-ignore
    FlipInXUp.withInitialValues({
      transform: [
        // @ts-expect-error FlipInXUp transforms are ordered: perspective, rotateX, translateY.
        { rotateX: '90deg' }, { perspective: 500 },
        { translateY: 0 },
      ],
    });

    FlipInXUp.withInitialValues({
      transform: [
        {
          // @ts-expect-error `perspective` must be a number, not a CSS string.
          perspective: '500px',
        },
        { rotateX: '90deg' },
        { translateY: 0 },
      ],
    });

    ZoomInRotate.withInitialValues({
      transform: [
        { scale: 0 },
        {
          // @ts-expect-error `rotate` must be a string, not a number.
          rotate: 45,
        },
      ],
    });

    SlideInRight.withInitialValues({
      // @ts-expect-error SlideInRight uses `originX`, not `originY`.
      originY: 100,
    });

    StretchInX.withInitialValues({
      transform: [
        {
          // @ts-expect-error StretchInX uses `scaleX`, not `scale`.
          scale: 0,
        },
      ],
    });

    BounceIn.withInitialValues({
      transform: [
        {
          // @ts-expect-error Unknown transform key `foo`.
          foo: 1,
        },
      ],
    });
  }

  function LayoutAnimationsAssignableToEnteringExitingTest() {
    return (
      <View>
        <Animated.View
          entering={FadeInRight.withInitialValues({
            opacity: 0.1,
            transform: [{ translateX: 20 }],
          })}
          exiting={FadeOutDown.withInitialValues({
            opacity: 0,
            transform: [{ translateY: 80 }],
          })}
        />
      </View>
    );
  }
}

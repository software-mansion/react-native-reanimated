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

  function LayoutAnimationsWithInitialValuesFlatProps() {
    // New flat API — one flat prop per transform slot.
    const fadeInRightFlatTranslate = FadeInRight.withInitialValues({
      translateX: 50,
    });

    // Flat translate also accepts percentage strings.
    const fadeInRightFlatPercent = FadeInRight.withInitialValues({
      translateX: '50%',
    });

    // Can mix flat opacity with flat translate.
    const fadeInRightFlatBoth = FadeInRight.withInitialValues({
      opacity: 0.5,
      translateX: 50,
    });

    // Flat translateY.
    const fadeOutDownFlat = FadeOutDown.withInitialValues({
      translateY: 80,
    });

    // Override only one transform slot on a multi-transform animation.
    const flipInXUpFlatOnlyRotate = FlipInXUp.withInitialValues({
      rotateX: '45deg',
    });

    // Override all transforms via flat props (no transform tuple).
    const flipInXUpFlatAll = FlipInXUp.withInitialValues({
      perspective: 1000,
      rotateX: '90deg',
      translateY: -100,
    });

    // Flat props on Bounce (scale only).
    const bounceInFlat = BounceIn.withInitialValues({ scale: 0.25 });

    // Flat props on Zoom with rotate.
    const zoomInRotateFlat = ZoomInRotate.withInitialValues({
      scale: 0,
      rotate: '45deg',
    });

    // Flat props on Lightspeed.
    const lightSpeedInRightFlat = LightSpeedInRight.withInitialValues({
      opacity: 0,
      translateX: 200,
      skewX: '-45deg',
    });

    // Flat props on Pinwheel.
    const pinwheelInFlat = PinwheelIn.withInitialValues({
      opacity: 0,
      scale: 0,
      rotate: '5rad',
    });

    // Flat props on Roll.
    const rollInLeftFlat = RollInLeft.withInitialValues({
      translateX: -200,
      rotate: '-180deg',
    });

    // Flat props on Rotate.
    const rotateInDownLeftFlat = RotateInDownLeft.withInitialValues({
      opacity: 0,
      rotate: '-90deg',
      translateX: 10,
      translateY: -10,
    });

    // Flat props on Stretch.
    const stretchInXFlat = StretchInX.withInitialValues({ scaleX: 0 });
  }

  function LayoutAnimationsWithInitialValuesFlatAndTupleCombined() {
    // Both APIs should type-check simultaneously. At runtime, the flat prop
    // wins over the deprecated tuple entry at any slot where both are set.

    // Flat `opacity` alongside a tuple `transform`.
    const fadeInRightFlatOpacityPlusTuple = FadeInRight.withInitialValues({
      opacity: 0.1,
      transform: [{ translateX: 50 }],
    });

    // Flat `translateX` alongside a tuple `transform` for the same slot
    // (flat wins at runtime).
    const fadeInRightFlatPlusTupleSameSlot = FadeInRight.withInitialValues({
      translateX: 100,
      transform: [{ translateX: 50 }],
    });

    // Flat `opacity` + `translateX` + deprecated `transform` — redundant but
    // legal.
    const fadeInRightFlatAllPlusTuple = FadeInRight.withInitialValues({
      opacity: 0.1,
      translateX: 100,
      transform: [{ translateX: 50 }],
    });

    // Multi-slot: flat for one slot + tuple for the rest.
    const flipInXUpFlatRotatePlusTuple = FlipInXUp.withInitialValues({
      rotateX: '45deg',
      transform: [
        { perspective: 1000 },
        { rotateX: '90deg' },
        { translateY: -100 },
      ],
    });

    // Multi-slot: flat for all slots + tuple too.
    const flipInXUpFlatAllPlusTuple = FlipInXUp.withInitialValues({
      perspective: 750,
      rotateX: '45deg',
      translateY: -50,
      transform: [
        { perspective: 1000 },
        { rotateX: '90deg' },
        { translateY: -100 },
      ],
    });

    // Combined on Bounce.
    const bounceInFlatPlusTuple = BounceIn.withInitialValues({
      scale: 0.5,
      transform: [{ scale: 0.25 }],
    });

    // Combined on Zoom with two transform slots.
    const zoomInRotateCombined = ZoomInRotate.withInitialValues({
      scale: 0.25,
      transform: [{ scale: 0 }, { rotate: '45deg' }],
    });

    // Combined on Lightspeed.
    const lightSpeedInRightCombined = LightSpeedInRight.withInitialValues({
      opacity: 0,
      skewX: '-30deg',
      transform: [{ translateX: 200 }, { skewX: '-45deg' }],
    });

    // Combined on Pinwheel.
    const pinwheelInCombined = PinwheelIn.withInitialValues({
      opacity: 0,
      rotate: '3rad',
      transform: [{ scale: 0 }, { rotate: '5rad' }],
    });

    // Combined on Rotate (3-slot transform).
    const rotateInDownLeftCombined = RotateInDownLeft.withInitialValues({
      opacity: 0,
      translateY: -20,
      transform: [
        { rotate: '-90deg' },
        { translateX: 10 },
        { translateY: -10 },
      ],
    });

    // Combined on Roll.
    const rollInLeftCombined = RollInLeft.withInitialValues({
      rotate: '-90deg',
      transform: [{ translateX: -200 }, { rotate: '-180deg' }],
    });

    // Combined on Stretch.
    const stretchInXCombined = StretchInX.withInitialValues({
      scaleX: 0.5,
      transform: [{ scaleX: 0 }],
    });
  }

  function LayoutAnimationsWithInitialValuesFlatPropsRejectsTest() {
    FadeInRight.withInitialValues({
      // @ts-expect-error Flat `translateX` must be a number or `${number}%`, not an arbitrary string.
      translateX: 'left',
    });

    FadeInRight.withInitialValues({
      // @ts-expect-error FadeInRight has no `translateY` slot.
      translateY: 50,
    });

    ZoomInRotate.withInitialValues({
      // @ts-expect-error Flat `rotate` must be a string, not a number.
      rotate: 45,
    });

    FlipInXUp.withInitialValues({
      // @ts-expect-error Flat `perspective` must be a number, not a CSS string.
      perspective: '500px',
    });

    StretchInX.withInitialValues({
      // @ts-expect-error StretchInX uses `scaleX`, not `scale`.
      scale: 0,
    });

    SlideInRight.withInitialValues({
      // @ts-expect-error SlideInRight uses `originX`, not `originY`.
      originY: 100,
    });

    BounceIn.withInitialValues({
      // @ts-expect-error Unknown flat prop `foo`.
      foo: 1,
    });
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

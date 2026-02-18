/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';

import Animated, {
  interpolateColor,
  useDerivedValue,
  useSharedValue,
} from '../..';

function InlineStylesTest() {
  function InlineStylesTest1() {
    const animatedIndex = useSharedValue(0);
    const backgroundColor = useDerivedValue(() => {
      return interpolateColor(
        animatedIndex.value,
        [0, 1, 2],
        ['#273D3A', '#8B645C', '#60545A']
      );
    });
    <Animated.View
      style={{
        flex: 1,
        height: '100%',
        backgroundColor,
      }}
    />;
  }

  function InlineStylesTest2() {
    const animatedFlex = useSharedValue(0);
    <Animated.View
      style={{
        flex: animatedFlex,
        height: '100%',
      }}
    />;
  }

  function InlineStylesTest3() {
    const sv = useSharedValue(0);
    return <Animated.View style={{ width: sv }} />;
  }

  function InlineStylesTest4() {
    const sv = useSharedValue('0');
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={{ width: sv }} />;
  }

  function InlineStylesTest5() {
    const sv = useSharedValue({ width: 0 });
    return <Animated.View style={sv} />;
  }

  function InlineStylesTest6() {
    const sv = useSharedValue({ width: '0' });
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={sv} />;
  }

  function InlineStylesTest7() {
    const sv = useSharedValue(0);
    return <Animated.View style={{ transform: [{ translateX: sv }] }} />;
  }

  function InlineStylesTest8() {
    const sv = useSharedValue(0);
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={{ transform: [{ rotate: sv }] }} />;
  }

  function InlineStylesTest9() {
    const sv = useSharedValue({ translateX: 0 });
    return <Animated.View style={{ transform: [sv] }} />;
  }

  function InlineStylesTest10() {
    const sv = useSharedValue({ rotate: 0 });
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={{ transform: [sv] }} />;
  }

  function InlineStylesTest11() {
    const sv = useSharedValue([{ translateX: 0 }]);
    return <Animated.View style={{ transform: sv }} />;
  }

  function InlineStylesTest12() {
    const sv = useSharedValue([{ rotate: 0 }]);
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={{ transform: sv }} />;
  }

  function InlineStylesTest13() {
    const sv = useSharedValue({ transform: [{ translateX: 0 }] });
    return <Animated.View style={sv} />;
  }

  function InlineStylesTest14() {
    const sv = useSharedValue({ transform: [{ rotate: 0 }] });
    // @ts-expect-error properly detects illegal type
    return <Animated.View style={sv} />;
  }

  function InlineStylesTest15() {
    const sv = useSharedValue(0);

    return (
      <>
        <Animated.View
          style={{
            shadowOffset: {
              width: sv.value,
              height: sv.value,
            },
          }}
        />
        <Animated.View
          style={{
            shadowOffset: {
              width: sv.get(),
              height: sv.get(),
            },
          }}
        />
      </>
    );
  }

  function InlineStylesTest16() {
    const sv = useSharedValue(0);

    return (
      <>
        <Animated.View
          // @ts-expect-error properly detects illegal type
          style={{
            shadowOffset: {
              width: sv.value,
            },
          }}
        />
        <Animated.View
          // @ts-expect-error properly detects illegal type
          style={{
            shadowOffset: {
              width: sv.get(),
            },
          }}
        />
      </>
    );
  }

  function InlineStylesTest17() {
    const sv = useSharedValue({ width: 0, height: 0 });

    return (
      <>
        <Animated.View
          style={{
            shadowOffset: sv.value,
          }}
        />
        <Animated.View
          style={{
            shadowOffset: sv.get(),
          }}
        />
      </>
    );
  }

  function InlineStylesTest18() {
    const sv = useSharedValue({ width: 0 });

    return (
      <>
        <Animated.View
          // @ts-expect-error properly detects illegal type
          style={{
            shadowOffset: sv.value,
          }}
        />
        <Animated.View
          // @ts-expect-error properly detects illegal type
          style={{
            shadowOffset: sv.get(),
          }}
        />
      </>
    );
  }

  function InlineStylesTest19() {
    const sv = useSharedValue({ shadowOffset: { width: 0, height: 0 } });
    return <Animated.View style={sv} />;
  }

  function InlineStylesTest20() {
    const sv = useSharedValue({ shadowOffset: { width: 0 } });
    return (
      <Animated.View
        // @ts-expect-error properly detects illegal type
        style={{
          shadowOffset: sv,
        }}
      />
    );
  }

  function InlineStylesTest21() {
    return <Animated.View style={{ flexWrap: 'wrap' }} />;
  }

  function InlineStylesTest22() {
    return <Animated.View style={{ flexWrap: 'wrap' as const }} />;
  }

  function InlineStylesTest23() {
    return (
      <>
        <Animated.View style={{ overflow: 'scroll' }} />
        <Animated.Image
          source={{ uri: 'uri' }}
          // @ts-expect-error properly detects illegal type */
          style={{ overflow: 'scroll' }}
        />
        <Animated.Text style={{ overflow: 'scroll' }} />
      </>
    );
  }

  function InlineStylesTest24() {
    return (
      <>
        <Animated.View style={{ overflow: 'hidden' }} />
        <Animated.Image
          source={{ uri: 'uri' }}
          style={{ overflow: 'hidden' }}
        />
        ;
        <Animated.Text style={{ overflow: 'hidden' }} />
      </>
    );
  }

  function InlineStylesTest25() {
    // @ts-expect-error Passing a number here will work,
    // but we don't allow for it as a part of API.
    return <Animated.View style={{ backgroundColor: 0x000000 }} />;
  }
}

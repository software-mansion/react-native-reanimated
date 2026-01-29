/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import type { FlatListProps } from 'react-native';
import { FlatList } from 'react-native';

import Animated, { useAnimatedProps } from '../..';

function AnimatedPropsTest() {
  function AnimatedPropsTestClass1() {
    class Path extends React.Component<{ fill?: string }> {
      render() {
        return null;
      }
    }
    const AnimatedPath = Animated.createAnimatedComponent(Path);
    const animatedProps = useAnimatedProps(() => ({ fill: 'blue' }));
    return (
      <AnimatedPath
        animatedProps={animatedProps}
        // @ts-expect-error `style` was not defined in `Path`'s props
        style={{ backgroundColor: 'red' }}
      />
    );
  }

  function AnimatedPropsTestClass2() {
    class Path extends React.Component<{ fill?: string }> {
      render() {
        return null;
      }
    }
    const AnimatedPath = Animated.createAnimatedComponent(Path);
    const animatedProps = useAnimatedProps(() => ({ fill2: 'blue' }));
    return (
      // @ts-expect-error
      <AnimatedPath animatedProps={animatedProps} />
    );
  }

  function AnimatedPropsTestView1() {
    const animatedProps = useAnimatedProps(
      () => ({ pointerEvents: 'none' }) as const
    );
    return <Animated.View animatedProps={animatedProps} />;
  }

  function AnimatedPropsTestView2() {
    const cssProps = {
      animationName: { from: { pointerEvents: 'auto' as const } },
    };
    return <Animated.View animatedProps={cssProps} />;
  }

  function AnimatedPropsTestView3() {
    // @ts-expect-error Fails because of the invalid `animationName` type
    return <Animated.View animatedProps={{ animationName: 'name' }} />;
  }

  function AnimatedPropsTestView4() {
    const cssProps = {
      animationName: { from: { backgroundColor: 'red' } },
    };
    // @ts-expect-error Fails because style properties aren't allowed in animatedProps
    return <Animated.View animatedProps={cssProps} />;
  }

  function AnimatedPropsTestPartial1() {
    const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const optionalProps = useAnimatedProps<FlatListProps<unknown>>(() => ({
      style: {},
    }));

    // Should pass because required props are set.
    return (
      <>
        <AnimatedFlatList
          data={['1']}
          renderItem={() => null}
          animatedProps={optionalProps}
        />
        ;
        <Animated.FlatList
          data={['1']}
          renderItem={() => null}
          animatedProps={optionalProps}
        />
        ;
      </>
    );
  }

  function AnimatedPropsTestPartial2() {
    const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const optionalProps = useAnimatedProps<FlatListProps<string>>(() => ({
      style: {},
    }));

    // Shouldn't pass because required props are not set.
    return (
      <>
        {/* @ts-expect-error Correctly detects that required props are not set. */}
        <AnimatedFlatList animatedProps={optionalProps} />
        {/* @ts-expect-error Correctly detects that required props are not set. */}
        <Animated.FlatList animatedProps={optionalProps} />
      </>
    );
  }

  function AnimatedPropsTestPartial3() {
    const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const requiredProps = useAnimatedProps<FlatListProps<string>>(() => ({
      data: ['1'],
      renderItem: () => null,
    }));

    // This test has a generic type mismatch issue:
    // createAnimatedComponent(FlatList) creates FlatListProps<unknown>
    // but requiredProps is FlatListProps<string>
    // TODO: Fix generic propagation in createAnimatedComponent for FlatList
    return (
      <>
        {/* @ts-expect-error Generic type mismatch (string vs unknown) */}
        <AnimatedFlatList animatedProps={requiredProps} />;
        {/* @ts-expect-error Animated.FlatList uses separate typing */}
        <Animated.FlatList animatedProps={requiredProps} />;
      </>
    );
  }

  function AnimatedPropsTestPartial4() {
    const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const partOfRequiredProps = useAnimatedProps<FlatListProps<string>>(() => ({
      data: ['1'],
    }));
    // This test has a generic type mismatch issue:
    // createAnimatedComponent(FlatList) creates FlatListProps<unknown>
    // but partOfRequiredProps is FlatListProps<string>
    // TODO: Fix generic propagation in createAnimatedComponent for FlatList
    return (
      <>
        <AnimatedFlatList
          renderItem={() => null}
          // @ts-expect-error Generic type mismatch (string vs unknown)
          animatedProps={partOfRequiredProps}
        />
        {/* @ts-expect-error Generic type mismatch + Animated.FlatList uses separate typing */}
        <Animated.FlatList
          animatedProps={partOfRequiredProps}
          renderItem={() => null}
        />
        ;
      </>
    );
  }

  function AnimatedPropsTestMultiple1() {
    const animatedProps1 = useAnimatedProps(() => ({
      pointerEvents: 'none' as const,
    }));
    const animatedProps2 = useAnimatedProps(() => ({
      pointerEvents: 'auto' as const,
    }));
    return <Animated.View animatedProps={[animatedProps1, animatedProps2]} />;
  }

  function AnimatedPropsMultiple2() {
    const cssProps1 = {
      animationName: { from: { pointerEvents: 'auto' as const } },
    };
    const cssProps2 = {
      animationName: { to: { pointerEvents: 'none' as const } },
    };
    return <Animated.View animatedProps={[cssProps1, cssProps2]} />;
  }

  function AnimatedPropsMultiple3() {
    const animatedProps = useAnimatedProps(() => ({
      pointerEvents: 'none' as const,
    }));
    const cssProps = {
      animationName: { to: { pointerEvents: 'auto' as const } },
    };
    return <Animated.View animatedProps={[animatedProps, cssProps]} />;
  }

  function AnimatedPropsNestedArrays() {
    const animatedProps = useAnimatedProps(() => ({
      pointerEvents: 'none' as const,
    }));
    const cssProps = {
      animationName: {
        from: { pointerEvents: 'auto' as const },
        to: { pointerEvents: 'none' as const },
      },
    };
    const accessibilityProps = useAnimatedProps(() => ({
      accessibilityLiveRegion: 'polite' as const,
    }));
    return (
      <Animated.View
        animatedProps={[[animatedProps, cssProps], [[accessibilityProps]]]}
      />
    );
  }

  function AnimatedPropsDeeplyNestedArrays() {
    const cssFrom = {
      animationName: { from: { pointerEvents: 'auto' as const } },
    };
    const cssTo = {
      animationName: { to: { pointerEvents: 'none' as const } },
    };
    return (
      <Animated.View
        animatedProps={[[cssFrom], [[cssTo], [[[cssFrom, cssTo]]]]]}
      />
    );
  }

  function UseAnimatedPropsTestMultipleRejectInvalidType() {
    const animatedProps = useAnimatedProps(() => ({
      pointerEvents: 'none' as const,
    }));
    return (
      // @ts-expect-error Invalid types are not supported - only useAnimatedProps results are allowed in the array
      <Animated.View animatedProps={[animatedProps, 'invalid']} />
    );
  }

  // Test that required props become optional when provided via animatedProps
  function AnimatedPropsRequiredPropsBecomeOptional() {
    interface CustomProps {
      requiredProp: number;
      optionalProp?: string;
    }

    function CustomComponent(props: CustomProps) {
      return null;
    }

    const AnimatedCustom = Animated.createAnimatedComponent(CustomComponent);

    const animatedProps = useAnimatedProps(() => ({
      requiredProp: 42,
    }));

    // With the new typing, `requiredProp` is optional because it's provided via animatedProps
    return (
      <>
        <AnimatedCustom animatedProps={animatedProps} />
        <AnimatedCustom animatedProps={animatedProps} optionalProp="test" />
        {/* Can still pass requiredProp directly if desired */}
        <AnimatedCustom requiredProp={100} />
      </>
    );
  }

  // Test that props NOT in animatedProps are still required
  function AnimatedPropsPartialRequiredStillRequired() {
    interface CustomProps {
      requiredProp1: number;
      requiredProp2: string;
    }

    function CustomComponent(props: CustomProps) {
      return null;
    }

    const AnimatedCustom = Animated.createAnimatedComponent(CustomComponent);

    // Only provide requiredProp1 via animatedProps
    const animatedProps = useAnimatedProps(() => ({
      requiredProp1: 42,
    }));

    return (
      <>
        {/* requiredProp2 must still be provided directly */}
        <AnimatedCustom animatedProps={animatedProps} requiredProp2="test" />
        {/* @ts-expect-error requiredProp2 is missing */}
        <AnimatedCustom animatedProps={animatedProps} />
      </>
    );
  }
}

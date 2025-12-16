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

    // Should pass because required props are set but fails
    // because AnimatedProps are incorrectly typed.
    return (
      <>
        {/* @ts-expect-error Fails due to bad type. */}
        <AnimatedFlatList animatedProps={requiredProps} />;
        {/* @ts-expect-error Fails due to bad type. */}
        <Animated.FlatList animatedProps={requiredProps} />;
      </>
    );
  }

  function AnimatedPropsTestPartial4() {
    const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const partOfRequiredProps = useAnimatedProps<FlatListProps<string>>(() => ({
      data: ['1'],
    }));
    // TODO
    // Should pass because required props are set but fails
    // because useAnimatedProps and createAnimatedComponent are incorrectly typed.
    return (
      <>
        <AnimatedFlatList
          renderItem={() => null}
          // @ts-expect-error Fails due to bad type.
          animatedProps={partOfRequiredProps}
        />
        {/* @ts-expect-error Fails due to bad type. */}
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
}

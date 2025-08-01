/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import type { FlatListProps } from 'react-native';
import { FlatList } from 'react-native';

import type { CSSStyle } from '../..';
import Animated, { useAnimatedProps } from '../..';

function UseAnimatedPropsTest() {
  function UseAnimatedPropsTestClass1() {
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

  function UseAnimatedPropsTestClass2() {
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

  function UseAnimatedPropsTestView1() {
    const animatedProps = useAnimatedProps(
      () => ({ pointerEvents: 'none' }) as const
    );
    return <Animated.View animatedProps={animatedProps} />;
  }

  function UseAnimatedPropsTestView2() {
    const cssProps: CSSStyle = {
      animationName: { from: { backgroundColor: 'red' } },
    };
    return <Animated.View animatedProps={cssProps} />;
  }

  function UseAnimatedPropsTestView3() {
    // @ts-expect-error Fails because of the invalid `animationName` type
    return <Animated.View animatedProps={{ animationName: 'name' }} />;
  }

  function UseAnimatedPropsTestPartial1() {
    const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
    const optionalProps = useAnimatedProps<FlatListProps<unknown>>(() => ({
      style: {},
    }));
    const requiredProps = useAnimatedProps<FlatListProps<unknown>>(() => ({
      data: ['1'],
      renderItem: () => null,
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

  function UseAnimatedPropsTestPartial2() {
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

  function UseAnimatedPropsTestPartial3() {
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

  function UseAnimatedPropsTestPartial4() {
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

  function UseAnimatedPropsTestMultiple1() {
    const animatedProps1 = useAnimatedProps(() => ({
      pointerEvents: 'none' as const,
    }));
    const animatedProps2 = useAnimatedProps(() => ({
      pointerEvents: 'auto' as const,
    }));
    return <Animated.View animatedProps={[animatedProps1, animatedProps2]} />;
  }

  function UseAnimatedPropsMultiple2() {
    const cssProps1: CSSStyle = {
      animationName: { from: { backgroundColor: 'red' } },
    };
    const cssProps2: CSSStyle = {
      animationName: { to: { backgroundColor: 'blue' } },
    };
    return <Animated.View animatedProps={[cssProps1, cssProps2]} />;
  }

  function UseAnimatedPropsMultiple3() {
    const animatedProps = useAnimatedProps(() => ({
      pointerEvents: 'none' as const,
    }));
    const cssProps: CSSStyle = {
      animationName: { to: { backgroundColor: 'blue' } },
    };
    return <Animated.View animatedProps={[animatedProps, cssProps]} />;
  }
}

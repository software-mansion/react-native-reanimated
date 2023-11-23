'use strict';
import type { ForwardedRef } from 'react';
import React, { forwardRef } from 'react';
import type {
  FlatListProps,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { FlatList } from 'react-native';
import { AnimatedView } from './View';
import { createAnimatedComponent } from '../../createAnimatedComponent';
import type { ILayoutAnimationBuilder } from '../layoutReanimation/animationBuilder/commonTypes';
import { LayoutAnimationConfig } from './LayoutAnimationConfig';
import type { AnimatedProps, AnimatedStyle } from '../helperTypes';

const AnimatedFlatList = createAnimatedComponent(FlatList);

interface CellRendererComponentProps {
  onLayout?: ((event: LayoutChangeEvent) => void) | undefined;
  children: React.ReactNode;
  style?: StyleProp<AnimatedStyle<ViewStyle>>;
}

const createCellRendererComponent = (
  itemLayoutAnimation?: ILayoutAnimationBuilder
) => {
  const CellRendererComponent = (props: CellRendererComponentProps) => {
    return (
      <AnimatedView
        // TODO TYPESCRIPT This is temporary cast is to get rid of .d.ts file.
        layout={itemLayoutAnimation as any}
        onLayout={props.onLayout}
        style={props.style}>
        {props.children}
      </AnimatedView>
    );
  };

  return CellRendererComponent;
};

interface ReanimatedFlatListPropsWithLayout<T>
  extends AnimatedProps<FlatListProps<T>> {
  itemLayoutAnimation?: ILayoutAnimationBuilder;
  skipEnteringExitingAnimations?: boolean;
}

export type FlatListPropsWithLayout<T> = ReanimatedFlatListPropsWithLayout<T>;

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedFlatListComplement<T> extends FlatList<T> {
  getNode(): FlatList<T>;
}

export const ReanimatedFlatList = forwardRef(
  (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: ReanimatedFlatListPropsWithLayout<any>,
    ref: ForwardedRef<FlatList>
  ) => {
    const { itemLayoutAnimation, skipEnteringExitingAnimations, ...restProps } =
      props;

    // Set default scrollEventThrottle, because user expects
    // to have continuous scroll events and
    // react-native defaults it to 50 for FlatLists.
    // We set it to 1 so we have peace until
    // there are 960 fps screens.
    if (!('scrollEventThrottle' in restProps)) {
      restProps.scrollEventThrottle = 1;
    }

    const CellRendererComponent = React.useMemo(
      () => createCellRendererComponent(itemLayoutAnimation),
      []
    );

    const animatedFlatList = (
      <AnimatedFlatList
        ref={ref}
        {...restProps}
        CellRendererComponent={CellRendererComponent}
      />
    );

    if (skipEnteringExitingAnimations === undefined) {
      return animatedFlatList;
    }

    return (
      <LayoutAnimationConfig skipEntering skipExiting>
        {animatedFlatList}
      </LayoutAnimationConfig>
    );
  }
);

export type ReanimatedFlatList<T> = typeof AnimatedFlatList &
  AnimatedFlatListComplement<T>;

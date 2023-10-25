'use strict';
import type { ForwardedRef } from 'react';
import React, { Component, forwardRef } from 'react';
import type { FlatListProps, LayoutChangeEvent } from 'react-native';
import { FlatList } from 'react-native';
import { AnimatedView } from './View';
import { createAnimatedComponent } from '../../createAnimatedComponent';
import type { ILayoutAnimationBuilder } from '../layoutReanimation/animationBuilder/commonTypes';
import type { StyleProps } from '../commonTypes';
import type { AnimateProps } from '../helperTypes';
import { LayoutAnimationConfig } from './LayoutAnimationConfig';

const AnimatedFlatList = createAnimatedComponent(FlatList as any) as any;

interface CellRendererComponentProps {
  onLayout: (event: LayoutChangeEvent) => void;
  // implicit `children` prop has been removed in @types/react^18.0.0
  children: React.ReactNode;
  style?: StyleProps;
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

interface ReanimatedFlatListPropsWithLayout<T> extends FlatListProps<T> {
  itemLayoutAnimation?: ILayoutAnimationBuilder;
  skipEnteringExitingAnimations?: boolean;
}

export type FlatListPropsWithLayout<T> = ReanimatedFlatListPropsWithLayout<T>;

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
declare class ReanimatedFlatListClass<T> extends Component<
  AnimateProps<ReanimatedFlatListPropsWithLayout<T>>
> {
  getNode(): FlatList;
}

interface ReanimatedFlatListProps<ItemT> extends FlatListProps<ItemT> {
  itemLayoutAnimation?: ILayoutAnimationBuilder;
  skipEnteringExitingAnimations?: boolean;
}

export const ReanimatedFlatList = forwardRef(
  (props: ReanimatedFlatListProps<any>, ref: ForwardedRef<FlatList>) => {
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
) as unknown as ReanimatedFlatList<any>;

export type ReanimatedFlatList<T> = typeof ReanimatedFlatListClass<T> &
  FlatList<T>;

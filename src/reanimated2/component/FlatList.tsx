import React, { ForwardedRef, forwardRef, RefAttributes } from 'react';
import { FlatList, FlatListProps, LayoutChangeEvent } from 'react-native';
import { AnimatedView } from './View';
import createAnimatedComponent from '../../createAnimatedComponent';
import { ILayoutAnimationBuilder } from '../layoutReanimation/animationBuilder/commonTypes';

const AnimatedFlatList = createAnimatedComponent(FlatList as any) as any;

interface AnimatedFlatListProps {
  onLayout: (event: LayoutChangeEvent) => void;
  // implicit `children` prop has been removed in @types/react^18.0.0
  children: React.ReactNode;
}

const createCellRenderer = (itemLayoutAnimation?: ILayoutAnimationBuilder) => {
  const cellRenderer = (props: AnimatedFlatListProps) => {
    return (
      <AnimatedView layout={itemLayoutAnimation} onLayout={props.onLayout}>
        {props.children}
      </AnimatedView>
    );
  };

  return cellRenderer;
};

export interface ReanimatedFlatListProps<ItemT> extends FlatListProps<ItemT> {
  itemLayoutAnimation?: ILayoutAnimationBuilder;
}

export const ReanimatedFlatList = forwardRef(
  (props: ReanimatedFlatListProps<any>, ref: ForwardedRef<FlatList>) => {
    const { itemLayoutAnimation, ...restProps } = props;

    const cellRenderer = React.useMemo(
      () => createCellRenderer(itemLayoutAnimation),
      []
    );

    return (
      <AnimatedFlatList
        ref={ref}
        {...restProps}
        CellRendererComponent={cellRenderer}
      />
    );
  }
) as <T>(
  props: ReanimatedFlatListProps<T> & RefAttributes<FlatList<any>>
) => React.ReactElement;

export type RenimatedFlatList<T> = typeof ReanimatedFlatList<T> & FlatList<T>;

import React, { ForwardedRef, forwardRef } from 'react';
import { FlatList, FlatListProps, LayoutChangeEvent } from 'react-native';
import ReanimatedView from './View';
import createAnimatedComponent from '../../createAnimatedComponent';
import { ILayoutAnimationBuilder } from '../layoutReanimation/animationBuilder/commonTypes';

const AnimatedFlatList = createAnimatedComponent(FlatList as any) as any;

const createCellRenderer = (itemLayoutAnimation?: ILayoutAnimationBuilder) => {
  const cellRenderer: React.FC<{
    onLayout: (event: LayoutChangeEvent) => void;
  }> = (props) => {
    return (
      <ReanimatedView layout={itemLayoutAnimation} onLayout={props.onLayout}>
        {props.children}
      </ReanimatedView>
    );
  };

  return cellRenderer;
};

export interface ReanimatedFlatlistProps<ItemT> extends FlatListProps<ItemT> {
  itemLayoutAnimation?: ILayoutAnimationBuilder;
}

type ReanimatedFlatListFC<T = any> = React.FC<ReanimatedFlatlistProps<T>>;

const ReanimatedFlatlist: ReanimatedFlatListFC = forwardRef(
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
);

export default ReanimatedFlatlist;

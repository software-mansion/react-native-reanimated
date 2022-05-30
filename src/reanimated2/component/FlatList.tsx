import React from 'react';
import {
  FlatList as RNFlatList,
  FlatListProps,
  LayoutChangeEvent,
} from 'react-native';
import { View } from './View';
import createAnimatedComponent from '../../createAnimatedComponent';
import { ILayoutAnimationBuilder } from '../layoutReanimation/animationBuilder/commonTypes';

const AnimatedFlatList = createAnimatedComponent(RNFlatList as any) as any;

interface AnimatedFlatListProps {
  onLayout: (event: LayoutChangeEvent) => void;
  // implicit `children` prop has been removed in @types/react^18.0.0
  children: React.ReactNode;
}

const createCellRenderer = (itemLayoutAnimation?: ILayoutAnimationBuilder) => {
  const cellRenderer = (props: AnimatedFlatListProps) => {
    return (
      <View layout={itemLayoutAnimation} onLayout={props.onLayout}>
        {props.children}
      </View>
    );
  };

  return cellRenderer;
};

export interface ReanimatedFlatListProps<ItemT> extends FlatListProps<ItemT> {
  itemLayoutAnimation?: ILayoutAnimationBuilder;
}

type ReanimatedFlatListFC<T = any> = React.FC<ReanimatedFlatListProps<T>>;

export const FlatList: ReanimatedFlatListFC = ({
  itemLayoutAnimation,
  ...restProps
}) => {
  const cellRenderer = React.useMemo(
    () => createCellRenderer(itemLayoutAnimation),
    []
  );
  return (
    <AnimatedFlatList {...restProps} CellRendererComponent={cellRenderer} />
  );
};

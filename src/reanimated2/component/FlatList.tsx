'use strict';
import React, { forwardRef, useRef } from 'react';
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
  itemLayoutAnimationRef?: React.MutableRefObject<
    ILayoutAnimationBuilder | undefined
  >
) => {
  const CellRendererComponent = (props: CellRendererComponentProps) => {
    return (
      <AnimatedView
        // TODO TYPESCRIPT This is temporary cast is to get rid of .d.ts file.
        layout={itemLayoutAnimationRef?.current as any}
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
  /**
   * Lets you pass layout animation directly to the FlatList item.
   */
  itemLayoutAnimation?: ILayoutAnimationBuilder;
  /**
   * Lets you skip entering and exiting animations of FlatList items when on FlatList mount or unmount.
   */
  skipEnteringExitingAnimations?: boolean;
}

export type FlatListPropsWithLayout<T> = ReanimatedFlatListPropsWithLayout<T>;

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedFlatListComplement<T> extends FlatList<T> {
  getNode(): FlatList<T>;
}

// We need explicit any here, because this is the exact same type that is used in React Native types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FlatListForwardRefRender = function <Item = any>(
  props: ReanimatedFlatListPropsWithLayout<Item>,
  ref: React.ForwardedRef<FlatList>
) {
  const { itemLayoutAnimation, skipEnteringExitingAnimations, ...restProps } =
    props;

  // Set default scrollEventThrottle, because user expects
  // to have continuous scroll events and
  // react-native defaults it to 50 for FlatLists.
  // We set it to 1, so we have peace until
  // there are 960 fps screens.
  if (!('scrollEventThrottle' in restProps)) {
    restProps.scrollEventThrottle = 1;
  }

  const itemLayoutAnimationRef = useRef(itemLayoutAnimation);
  itemLayoutAnimationRef.current = itemLayoutAnimation;

  const CellRendererComponent = React.useMemo(
    () => createCellRendererComponent(itemLayoutAnimationRef),
    [itemLayoutAnimationRef]
  );

  const animatedFlatList = (
    // @ts-expect-error In its current type state, createAnimatedComponent cannot create generic components.
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
};

export const ReanimatedFlatList = forwardRef(FlatListForwardRefRender) as <
  // We need explicit any here, because this is the exact same type that is used in React Native types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ItemT = any
>(
  props: ReanimatedFlatListPropsWithLayout<ItemT> & {
    ref?: React.ForwardedRef<FlatList>;
  }
) => React.ReactElement;

export type ReanimatedFlatList<T> = typeof AnimatedFlatList &
  AnimatedFlatListComplement<T>;

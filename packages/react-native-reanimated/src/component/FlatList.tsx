'use strict';
import type { RefObject } from 'react';
import { useMemo, useRef } from 'react';
import type {
  FlatListProps,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { FlatList } from 'react-native';

import type { AnimatedStyle, ILayoutAnimationBuilder } from '../commonTypes';
import { createAnimatedComponent } from '../createAnimatedComponent';
import type { AnimatedProps } from '../helperTypes';
import { LayoutAnimationConfig } from './LayoutAnimationConfig';
import { AnimatedView } from './View';

const AnimatedFlatList = createAnimatedComponent(FlatList);

interface CellRendererComponentProps<ItemT = any> {
  index: number;
  item: ItemT;
  onLayout?: ((event: LayoutChangeEvent) => void) | undefined;
  children: React.ReactNode;
  style?: StyleProp<AnimatedStyle<ViewStyle>>;
}

const createCellRendererComponent = (
  itemLayoutAnimationRef?: RefObject<ILayoutAnimationBuilder | undefined>,
  cellRendererComponentStyleRef?: RefObject<
    ReanimatedFlatListPropsWithLayout<any>['CellRendererComponentStyle']
  >
) => {
  const CellRendererComponent = (props: CellRendererComponentProps) => {
    return (
      <AnimatedView
        // TODO TYPESCRIPT This is temporary cast is to get rid of .d.ts file.
        layout={itemLayoutAnimationRef?.current as any}
        onLayout={props.onLayout}
        style={[
          props.style,
          typeof cellRendererComponentStyleRef?.current === 'function'
            ? cellRendererComponentStyleRef?.current({
                index: props.index,
                item: props.item,
              })
            : cellRendererComponentStyleRef?.current,
        ]}>
        {props.children}
      </AnimatedView>
    );
  };

  return CellRendererComponent;
};

interface ReanimatedFlatListPropsWithLayout<T>
  extends AnimatedProps<FlatListProps<T>> {
  /**
   * Lets you pass layout animation directly to the FlatList item. Works only
   * with a single-column `Animated.FlatList`, `numColumns` property cannot be
   * greater than 1.
   */
  itemLayoutAnimation?: ILayoutAnimationBuilder;
  /**
   * Lets you skip entering and exiting animations of FlatList items when on
   * FlatList mount or unmount.
   */
  skipEnteringExitingAnimations?: boolean;
  /** Property `CellRendererComponent` is not supported in `Animated.FlatList`. */
  CellRendererComponent?: never;
  /**
   * Either animated view styles or a function that receives the item to be
   * rendered and its index and returns animated view styles.
   */
  CellRendererComponentStyle?:
    | StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>
    | (({
        item,
        index,
      }: {
        item: T;
        index: number;
      }) => StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>)
    | undefined;
}

export type FlatListPropsWithLayout<T> = ReanimatedFlatListPropsWithLayout<T>;

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedFlatListComplement<T> extends FlatList<T> {
  getNode(): FlatList<T>;
}

// We need explicit any here, because this is the exact same type that is used in React Native types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FlatListRender = function <Item = any>(
  props: ReanimatedFlatListPropsWithLayout<Item>,
  ref: React.Ref<FlatList>
) {
  const {
    itemLayoutAnimation,
    skipEnteringExitingAnimations,
    CellRendererComponentStyle,
    ...restProps
  } = props;

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

  const cellRendererComponentStyleRef = useRef(CellRendererComponentStyle);
  cellRendererComponentStyleRef.current = CellRendererComponentStyle;

  const CellRendererComponent = useMemo(
    () =>
      createCellRendererComponent(
        itemLayoutAnimationRef,
        cellRendererComponentStyleRef
      ),
    []
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

export const ReanimatedFlatList = FlatListRender as <
  // We need explicit any here, because this is the exact same type that is used in React Native types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ItemT = any,
>(
  props: ReanimatedFlatListPropsWithLayout<ItemT> & {
    ref?: React.Ref<FlatList>;
  }
) => React.ReactElement;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReanimatedFlatList<T = any> = typeof AnimatedFlatList &
  AnimatedFlatListComplement<T>;

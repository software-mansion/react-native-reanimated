'use strict';
import React, { forwardRef, useRef, useState } from 'react';
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
import { isAndroid } from '../PlatformChecker';

const AnimatedFlatList = createAnimatedComponent(FlatList);
const IS_ANDROID = isAndroid();

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
  const [height, setHeight] = useState(0);
  const {
    itemLayoutAnimation,
    skipEnteringExitingAnimations,
    onLayout,
    contentContainerStyle,
    ...restProps
  } = props;

  /** Temporary (or not?) fix of https://github.com/software-mansion/react-native-reanimated/issues/5728
  The bug occurs only on android, when itemLayoutAnimation is provided and height is not hardcoded.
  To solve it, read actual height and define it */
  const heightIsNotHardcoded =
    !contentContainerStyle ||
    !('height' in contentContainerStyle) ||
    contentContainerStyle.height === undefined;

  const temporaryFixAndroidBug =
    IS_ANDROID && itemLayoutAnimation !== undefined && heightIsNotHardcoded;

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
      onLayout={
        temporaryFixAndroidBug
          ? (event: LayoutChangeEvent) => {
              if (onLayout && typeof onLayout === 'function') {
                onLayout(event);
              }
              setHeight(event.nativeEvent.layout.height);
            }
          : onLayout
      }
      contentContainerStyle={
        temporaryFixAndroidBug
          ? [{ height }, contentContainerStyle]
          : contentContainerStyle
      }
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

'use strict';
import React, { forwardRef, useRef } from 'react';
import { SectionList } from 'react-native';
import type {
  SectionListProps,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { AnimatedView } from './View';
import { createAnimatedComponent } from '../../createAnimatedComponent';
import type { ILayoutAnimationBuilder } from '../layoutReanimation/animationBuilder/commonTypes';
import { LayoutAnimationConfig } from './LayoutAnimationConfig';
import type { AnimatedProps, AnimatedStyle } from '../helperTypes';
import ScrollViewStickyHeaderWithForwardedRef from './StickyHeader';

const AnimatedSectionList = createAnimatedComponent(SectionList);

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

interface ReanimatedSectionListPropsWithLayout<T>
  extends AnimatedProps<SectionListProps<T>> {
  /**
   * Lets you pass layout animation directly to the SectionList item.
   */
  itemLayoutAnimation?: ILayoutAnimationBuilder;
  /**
   * Lets you skip entering and exiting animations of SectionList items when on SectionList mount or unmount.
   */
  skipEnteringExitingAnimations?: boolean;
}

export type SectionListPropsWithLayout<T> =
  ReanimatedSectionListPropsWithLayout<T>;

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedSectionListComplement<T> extends SectionList<T> {
  getNode(): SectionList<T>;
}

// We need explicit any here, because this is the exact same type that is used in React Native types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SectionListForwardRefRender = function <Item = any>(
  props: ReanimatedSectionListPropsWithLayout<Item>,
  ref: React.ForwardedRef<SectionList>
) {
  const { itemLayoutAnimation, skipEnteringExitingAnimations, ...restProps } =
    props;

  // Set default scrollEventThrottle, because user expects
  // to have continuous scroll events and
  // react-native defaults it to 50 for SectionLists.
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

  const animatedSectionList = (
    <AnimatedSectionList
      // @ts-expect-error In its current type state, createAnimatedComponent cannot create generic components.
      ref={ref}
      {...restProps}
      CellRendererComponent={CellRendererComponent}
      StickyHeaderComponent={ScrollViewStickyHeaderWithForwardedRef}
    />
  );

  if (skipEnteringExitingAnimations === undefined) {
    return animatedSectionList;
  }

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      {animatedSectionList}
    </LayoutAnimationConfig>
  );
};

export const ReanimatedSectionList = forwardRef(
  SectionListForwardRefRender
) as <
  // We need explicit any here, because this is the exact same type that is used in React Native types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ItemT = any
>(
  props: ReanimatedSectionListPropsWithLayout<ItemT> & {
    ref?: React.ForwardedRef<SectionList>;
  }
) => React.ReactElement;

export type ReanimatedSectionList<T> = typeof AnimatedSectionList &
  AnimatedSectionListComplement<T>;

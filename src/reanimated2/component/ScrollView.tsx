import type { ForwardedRef, RefObject } from 'react';
import React, { Component, forwardRef } from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import type { SharedValue } from '../commonTypes';
import type { AnimateProps } from '../helperTypes';
import { useAnimatedRef, useScrollViewOffset } from '../hook';

export interface AnimatedScrollViewProps extends ScrollViewProps {
  scrollViewOffset?: SharedValue<number>;
}

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
declare class AnimatedScrollViewClass extends Component<
  AnimateProps<AnimatedScrollViewProps>
> {
  getNode(): ScrollView;
}
// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AnimatedScrollViewInterface extends ScrollView {
  getNode(): ScrollView;
}

const AnimatedScrollViewComponent = createAnimatedComponent(
  ScrollView as any
) as any;

// type AnimatedScrollViewFC = React.FC<AnimatedScrollViewProps>;

export const AnimatedScrollView: AnimatedScrollView = forwardRef(
  (props: AnimatedScrollViewProps, ref: ForwardedRef<AnimatedScrollView>) => {
    const { scrollViewOffset, ...restProps } = props;
    const aref = ref === null ? useAnimatedRef<ScrollView>() : ref;

    if (scrollViewOffset) {
      useScrollViewOffset(
        aref as RefObject<AnimatedScrollView>,
        scrollViewOffset
      );
    }

    // Set default scrollEventThrottle, because user expects
    // to have continuous scroll events.
    // We set it to 1 so we have peace until
    // there are 960 fps screens.
    if (!('scrollEventThrottle' in restProps)) {
      restProps.scrollEventThrottle = 1;
    }

    return <AnimatedScrollViewComponent ref={aref} {...restProps} />;
  }
) as unknown as AnimatedScrollView;

export type AnimatedScrollView = typeof AnimatedScrollViewClass &
  AnimatedScrollViewInterface;

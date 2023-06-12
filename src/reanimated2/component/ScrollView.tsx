import React, { ForwardedRef, forwardRef, RefObject } from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import type Animated from 'react-native-reanimated';
import createAnimatedComponent from '../../createAnimatedComponent';
import { SharedValue } from '../commonTypes';
import { useScrollViewOffset, useAnimatedRef } from '../hook';

const AnimatedScrollViewComponent = createAnimatedComponent(
  ScrollView as any
) as any;

export interface AnimatedScrollViewProps extends ScrollViewProps {
  scrollViewOffset?: SharedValue<number>;
}

type AnimatedScrollViewFC = React.FC<AnimatedScrollViewProps>;

const AnimatedScrollView: AnimatedScrollViewFC = forwardRef(
  (props: AnimatedScrollViewProps, ref: ForwardedRef<Animated.ScrollView>) => {
    const { scrollViewOffset, ...restProps } = props;
    const aref = ref === null ? useAnimatedRef<ScrollView>() : ref;

    if (scrollViewOffset) {
      useScrollViewOffset(
        aref as RefObject<Animated.ScrollView>,
        scrollViewOffset
      );
    }
    return <AnimatedScrollViewComponent ref={aref} {...restProps} />;
  }
);
export default AnimatedScrollView;

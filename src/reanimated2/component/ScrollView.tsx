import { ForwardedRef, forwardRef, RefObject, useEffect } from 'react';
import Animated, {
  findNodeHandle,
  ScrollView,
  ScrollViewProps,
} from 'react-native';
import { scrollTo } from '../NativeMethods';
import { SharedValue as NativeSharedValue } from '../commonTypes';
import createAnimatedComponent from '../../createAnimatedComponent';
import type { SharedValue } from 'react-native-reanimated';
import { useAnimatedRef, useEvent } from '../hook';
import { ScrollEvent } from '../hook/useAnimatedScrollHandler';
import { runOnUI } from '../threads';

const AnimatedScrollViewComponent = createAnimatedComponent(
  ScrollView as any
) as any;

const scrollEventNames = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];

export interface AnimatedScrollViewProps extends ScrollViewProps {
  scrollViewOffset?: SharedValue<number>;
}

interface ScrollSharedValue<T> extends NativeSharedValue<T> {
  triggerScrollListener?: boolean;
  triggerOffsetEvent?: boolean;
}

type AnimatedScrollViewFC = React.FC<AnimatedScrollViewProps>;

const addListenerToScroll = (
  offsetRef: ScrollSharedValue<number>,
  animatedRef: any,
  horizontal: boolean
) => {
  runOnUI(() => {
    'worklet';
    offsetRef.triggerScrollListener = true;
    offsetRef.triggerOffsetEvent = true;
    offsetRef.addListener(animatedRef(), (newValue: any) => {
      if (offsetRef.triggerScrollListener) {
        const x = horizontal ? Number(newValue) : 0;
        const y = horizontal ? 0 : Number(newValue);
        offsetRef.triggerOffsetEvent = false;
        scrollTo(animatedRef, x, y, false);
      }
    });
  })();
};

const AnimatedScrollView: AnimatedScrollViewFC = forwardRef(
  (props: AnimatedScrollViewProps, ref: ForwardedRef<Animated.ScrollView>) => {
    const { scrollViewOffset, horizontal, ...restProps } = props;
    const aref = ref === null ? useAnimatedRef<ScrollView>() : ref;

    if (scrollViewOffset !== undefined) {
      const scrollPosition = scrollViewOffset as ScrollSharedValue<number>;

      const event = useEvent<ScrollEvent>((event: ScrollEvent) => {
        'worklet';
        if (!scrollPosition.triggerOffsetEvent) {
          scrollPosition.triggerOffsetEvent = true;
          return;
        }
        const newValue =
          event.contentOffset.x === 0
            ? event.contentOffset.y
            : event.contentOffset.x;

        scrollPosition.triggerScrollListener = false;
        // @ts-ignore Omit the setter to not override animation
        scrollPosition._value = newValue;
        scrollPosition.triggerScrollListener = true;
      }, scrollEventNames);

      useEffect(() => {
        scrollPosition.triggerOffsetEvent = true;
        scrollPosition.triggerScrollListener = true;

        if (aref !== null) {
          addListenerToScroll(scrollPosition, aref, horizontal ?? false);

          const viewTag = findNodeHandle(
            (aref as RefObject<Animated.ScrollView>).current
          );
          event.current?.registerForEvents(viewTag as number);
        }
      }, [(aref as RefObject<Animated.ScrollView>).current]);
    }

    return <AnimatedScrollViewComponent ref={aref} {...restProps} />;
  }
);
export default AnimatedScrollView;

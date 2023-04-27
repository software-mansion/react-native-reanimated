import { ForwardedRef, forwardRef, RefObject, useEffect } from 'react';
import Animated, {
  findNodeHandle,
  ScrollView,
  ScrollViewProps,
} from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import type { SharedValue } from 'react-native-reanimated';
import { useAnimatedRef, useEvent } from '../hook';
import { ScrollEvent } from '../hook/useAnimatedScrollHandler';

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

type AnimatedScrollViewFC = React.FC<AnimatedScrollViewProps>;

const AnimatedScrollView: AnimatedScrollViewFC = forwardRef(
  (props: AnimatedScrollViewProps, ref: ForwardedRef<Animated.ScrollView>) => {
    const { scrollViewOffset, ...restProps } = props;
    const aref = ref === null ? useAnimatedRef<ScrollView>() : ref;

    if (scrollViewOffset) {
      const event = useEvent<ScrollEvent>((event: ScrollEvent) => {
        'worklet';
        scrollViewOffset.value =
          event.contentOffset.x === 0
            ? event.contentOffset.y
            : event.contentOffset.x;
      }, scrollEventNames);

      useEffect(() => {
        if (aref !== null) {
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

import { useAnimatedScrollHandler } from '.';
import { SharedValue } from '../commonTypes';

export function useScrollViewPosition(position: SharedValue<number>) {
  return useAnimatedScrollHandler((event) => {
    position.value = event.contentOffset.y;
  });
}

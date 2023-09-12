import { NativeSyntheticEvent } from 'react-native';
import {
  PageScrollStateChangedEvent,
  PagerViewOnPageScrollEvent,
  PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
import { useEvent, useHandler } from 'react-native-reanimated';
import type { ReanimatedEvent } from 'react-native-reanimated';

export function useAnimatedPagerScrollHandler<
  TContext extends Record<string, unknown>
>(
  handlers: {
    onPageScroll: (
      e: ReanimatedEvent<PagerViewOnPageScrollEvent>,
      context: TContext
    ) => void;
  },
  dependencies?: unknown[]
): (e: PagerViewOnPageScrollEvent) => void {
  const { context, doDependenciesDiffer } = useHandler<
    PagerViewOnPageScrollEvent,
    TContext
  >(handlers, dependencies);

  return useEvent<PagerViewOnPageScrollEvent>(
    (event) => {
      'worklet';
      const { onPageScroll } = handlers;

      if (onPageScroll && event.eventName.endsWith('onPageScroll')) {
        onPageScroll(event, context);
      }
    },
    ['onPageScroll'],
    doDependenciesDiffer
  );
}

export function useAnimatedPagerScrollStateHandler<
  TContext extends Record<string, unknown>
>(
  handlers: {
    onPageScrollStateChanged: (
      e: ReanimatedEvent<PageScrollStateChangedEvent>,
      context: TContext
    ) => void;
  },
  dependencies?: Array<unknown>
): (e: NativeSyntheticEvent<PageScrollStateChangedEvent>) => void {
  const { context, doDependenciesDiffer } = useHandler<
    PageScrollStateChangedEvent,
    TContext
  >(handlers, dependencies);

  return useEvent<NativeSyntheticEvent<PageScrollStateChangedEvent>>(
    (event) => {
      'worklet';
      const { onPageScrollStateChanged } = handlers;

      if (
        onPageScrollStateChanged &&
        event.eventName.endsWith('onPageScrollStateChanged')
      ) {
        onPageScrollStateChanged(event, context);
      }
    },
    ['onPageScrollStateChanged'],
    doDependenciesDiffer
  );
}

export function useAnimatedPagerSelectedPageHandler<
  TContext extends Record<string, unknown>
>(
  handlers: {
    onPageSelected: (
      e: ReanimatedEvent<PagerViewOnPageSelectedEvent>,
      context: TContext
    ) => void;
  },
  dependencies?: Array<unknown>
): (e: PagerViewOnPageSelectedEvent) => void {
  const { context, doDependenciesDiffer } = useHandler<
    PagerViewOnPageSelectedEvent,
    TContext
  >(handlers, dependencies);

  return useEvent<PagerViewOnPageSelectedEvent>(
    (event) => {
      'worklet';
      const { onPageSelected } = handlers;

      if (onPageSelected && event.eventName.endsWith('onPageSelected')) {
        onPageSelected(event, context);
      }
    },
    ['onPageSelected'],
    doDependenciesDiffer
  );
}

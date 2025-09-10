import type { DependencyList, ReanimatedScrollEvent, RNNativeScrollEvent } from './commonTypes';
import type { EventHandlerProcessed } from './useEvent';
export type ScrollHandler<Context extends Record<string, unknown> = Record<string, unknown>> = (event: ReanimatedScrollEvent, context: Context) => void;
export interface ScrollHandlers<Context extends Record<string, unknown>> {
    onScroll?: ScrollHandler<Context>;
    onBeginDrag?: ScrollHandler<Context>;
    onEndDrag?: ScrollHandler<Context>;
    onMomentumBegin?: ScrollHandler<Context>;
    onMomentumEnd?: ScrollHandler<Context>;
}
export type ScrollHandlerProcessed<Context extends Record<string, unknown> = Record<string, unknown>> = EventHandlerProcessed<RNNativeScrollEvent, Context>;
/**
 * Lets you run callbacks on ScrollView events. Supports `onScroll`,
 * `onBeginDrag`, `onEndDrag`, `onMomentumBegin`, and `onMomentumEnd` events.
 *
 * These callbacks are automatically workletized and ran on the UI thread.
 *
 * @param handlers - An object containing event handlers.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @returns An object you need to pass to `onScroll` prop on the
 *   `Animated.ScrollView` component.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/scroll/useAnimatedScrollHandler
 */
export declare function useAnimatedScrollHandler<Context extends Record<string, unknown>>(handlers: ScrollHandler<Context> | ScrollHandlers<Context>, dependencies?: DependencyList): ScrollHandlerProcessed<Context>;
//# sourceMappingURL=useAnimatedScrollHandler.d.ts.map
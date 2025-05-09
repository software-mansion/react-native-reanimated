import type { EventHandlerProcessed } from './useEvent';
type ComposedHandlerProcessed<Event extends object, Context extends Record<string, unknown> = Record<string, unknown>> = EventHandlerProcessed<Event, Context>;
/**
 * Lets you compose multiple event handlers based on
 * [useEvent](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useEvent)
 * hook.
 *
 * @param handlers - An array of event handlers created using
 *   [useEvent](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useEvent)
 *   hook.
 * @returns An object you need to pass to a coresponding "onEvent" prop on an
 *   `Animated` component (for example handlers responsible for `onScroll` event
 *   go to `onScroll` prop).
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useComposedEventHandler
 */
export declare function useComposedEventHandler<Event extends object, Context extends Record<string, unknown>>(handlers: (EventHandlerProcessed<Event, Context> | null)[]): ComposedHandlerProcessed<Event, Context>;
export {};
//# sourceMappingURL=useComposedEventHandler.d.ts.map
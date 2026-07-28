'use strict';
import type { ComposedHandlerProcessed } from './useComposedEventHandlerCommon';
import { useComposedEventHandlerBase } from './useComposedEventHandlerCommon';
import type { EventHandlerProcessed } from './useEvent';

/**
 * Lets you compose multiple event handlers based on
 * [useEvent](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useEvent)
 * hook.
 *
 * @param handlers - An array of event handlers created using
 *   [useEvent](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useEvent)
 *   hook.
 * @returns An object you need to pass to a corresponding "onEvent" prop on an
 *   `Animated` component (for example handlers responsible for `onScroll` event
 *   go to `onScroll` prop).
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useComposedEventHandler
 */
// @ts-expect-error This overload is required by our API.
export function useComposedEventHandler<
  Event extends object,
  Context extends Record<string, unknown>,
>(
  handlers: (EventHandlerProcessed<Event, Context> | null)[]
): ComposedHandlerProcessed<Event, Context>;

export function useComposedEventHandler<
  Event extends object,
  Context extends Record<string, unknown>,
>(handlers: (EventHandlerProcessed<Event, Context> | null)[]) {
  return useComposedEventHandlerBase(handlers, handlers);
}

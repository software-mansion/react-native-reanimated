import { useEvent } from './useEvent';
import { useHandler } from './useHandler';
import { WorkletEventHandler } from '../WorkletEventHandler';
import type { ReanimatedEvent } from './commonTypes';
import type { WorkletFunction } from '../commonTypes';

/**
 * Lets you compose multiple event handlers based on [useEvent](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useEvent) hook.
 *
 * @param handlers - A list of event handlers created using [useEvent](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useEvent) hook.
 * @returns An object you need to pass to any "onEvent" prop on an `Animated` component.
 */
export function useComposedEventHandler<
  Context extends Record<string, unknown>
>(handlers: { workletEventHandler: typeof WorkletEventHandler }[]) {
  // Record of handlers' worklets to calculate deps diffs. We use the record type to match the useHandler API requirements
  const workletsRecord: Record<string, WorkletFunction> = {};
  // Summed event names for registration
  const composedEventNames = new Set<string>();
  // Map that holds worklets for specific handled events
  const workletsMap: {
    [key: string]: ((event: ReanimatedEvent<Event>) => void)[];
  } = {};

  handlers.forEach((handler) => {
    const { workletEventHandler } = handler;
    if (workletEventHandler instanceof WorkletEventHandler) {
      workletEventHandler.eventNames.forEach((event) => {
        composedEventNames.add(event);

        if (workletsMap[event]) {
          workletsMap[event].push(workletEventHandler.worklet);
        } else {
          workletsMap[event] = [workletEventHandler.worklet];
        }

        const handlerName = event + `${workletsMap[event].length}`;
        workletsRecord[handlerName] =
          workletEventHandler.worklet as WorkletFunction;
      });
    }
  });

  const { doDependenciesDiffer } = useHandler(workletsRecord);

  return useEvent<ReanimatedEvent<Event>, Context>(
    (event) => {
      'worklet';
      if (workletsMap[event.eventName]) {
        workletsMap[event.eventName].forEach((worklet) => worklet(event));
      }
    },
    Array.from(composedEventNames),
    doDependenciesDiffer
  );
}

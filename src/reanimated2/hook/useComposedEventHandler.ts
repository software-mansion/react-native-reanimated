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
  const workletsRecord: Record<string, WorkletFunction> = {};
  const composedEventNames = new Set<string>();
  const workletsMap: {
    [key: string]: ((event: ReanimatedEvent<Event>) => void)[];
  } = {};

  handlers.forEach((handler) => {
    const workletEventHandler = handler.workletEventHandler;
    if (workletEventHandler instanceof WorkletEventHandler) {
      workletEventHandler.eventNames.forEach((event) => {
        composedEventNames.add(event);

        if (workletsMap[event]) {
          workletsMap[event].push(workletEventHandler.worklet);
        } else {
          workletsMap[event] = [workletEventHandler.worklet];
        }

        workletsRecord[event + `${workletsMap[event].length}`] =
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

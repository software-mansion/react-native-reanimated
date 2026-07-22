'use strict';
import type { WorkletFunction } from 'react-native-worklets';

import { WorkletEventHandler } from '../WorkletEventHandler';
import type { DependencyList, ReanimatedEvent } from './commonTypes';
import type { EventHandlerInternal, EventHandlerProcessed } from './useEvent';
import { useEvent } from './useEvent';
import { useHandler } from './useHandler';

export type ComposedHandlerProcessed<
  Event extends object,
  Context extends Record<string, unknown> = Record<string, unknown>,
> = EventHandlerProcessed<Event, Context>;

type ComposedHandlerInternal<Event extends object> =
  EventHandlerInternal<Event>;

export function useComposedEventHandlerBase<
  Event extends object,
  Context extends Record<string, unknown>,
>(
  handlers: (EventHandlerProcessed<Event, Context> | null)[],
  dependencies: DependencyList
) {
  // Record of handlers' worklets to calculate deps diffs. We use the record type to match the useHandler API requirements
  const workletsRecord: Record<string, WorkletFunction> = {};
  // Summed event names for registration
  const composedEventNames = new Set<string>();
  // Map that holds worklets for specific handled events
  const workletsMap: {
    [key: string]: ((event: ReanimatedEvent<Event>) => void)[];
  } = {};

  handlers
    .filter((h) => h !== null)
    .forEach((handler) => {
      // EventHandlerProcessed is the return type of useEvent and has to be force casted to EventHandlerInternal, because we need WorkletEventHandler object
      const { workletEventHandler } =
        handler as unknown as EventHandlerInternal<Context>;
      if (workletEventHandler instanceof WorkletEventHandler) {
        workletEventHandler.eventNames.forEach((eventName) => {
          composedEventNames.add(eventName);

          if (workletsMap[eventName]) {
            workletsMap[eventName].push(workletEventHandler.worklet);
          } else {
            workletsMap[eventName] = [workletEventHandler.worklet];
          }

          const handlerName = eventName + `${workletsMap[eventName].length}`;
          workletsRecord[handlerName] =
            workletEventHandler.worklet as WorkletFunction;
        });
      }
    });

  const { doDependenciesDiffer } = useHandler(workletsRecord, dependencies);

  return useEvent<Event, Context>(
    (event) => {
      'worklet';
      if (workletsMap[event.eventName]) {
        workletsMap[event.eventName].forEach((worklet) => worklet(event));
      }
    },
    Array.from(composedEventNames),
    doDependenciesDiffer
  ) as unknown as ComposedHandlerInternal<Event>;
}

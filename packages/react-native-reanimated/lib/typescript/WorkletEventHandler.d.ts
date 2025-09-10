import type { NativeSyntheticEvent } from 'react-native';
import type { EventPayload, IWorkletEventHandler, ReanimatedEvent } from './hook/commonTypes';
type JSEvent<Event extends object> = NativeSyntheticEvent<EventPayload<Event>>;
declare class WorkletEventHandlerNative<Event extends object> implements IWorkletEventHandler<Event> {
    #private;
    eventNames: string[];
    worklet: (event: ReanimatedEvent<Event>) => void;
    constructor(worklet: (event: ReanimatedEvent<Event>) => void, eventNames: string[]);
    updateEventHandler(newWorklet: (event: ReanimatedEvent<Event>) => void, newEvents: string[]): void;
    registerForEvents(viewTag: number, fallbackEventName?: string): void;
    unregisterFromEvents(viewTag: number): void;
}
declare class WorkletEventHandlerWeb<Event extends object> implements IWorkletEventHandler<Event> {
    eventNames: string[];
    listeners: Record<string, (event: ReanimatedEvent<ReanimatedEvent<Event>>) => void> | Record<string, (event: JSEvent<Event>) => void>;
    worklet: (event: ReanimatedEvent<Event>) => void;
    constructor(worklet: (event: ReanimatedEvent<Event>) => void, eventNames?: string[]);
    setupWebListeners(): void;
    updateEventHandler(newWorklet: (event: ReanimatedEvent<Event>) => void, newEvents: string[]): void;
    registerForEvents(_viewTag: number, _fallbackEventName?: string): void;
    unregisterFromEvents(_viewTag: number): void;
}
export declare const WorkletEventHandler: typeof WorkletEventHandlerNative | typeof WorkletEventHandlerWeb;
export {};
//# sourceMappingURL=WorkletEventHandler.d.ts.map
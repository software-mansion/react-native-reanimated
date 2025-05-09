import type { DependencyList, NativeEventWrapper, ReanimatedEvent } from './commonTypes';
declare const EVENT_TYPE: {
    readonly UNDETERMINED: 0;
    readonly FAILED: 1;
    readonly BEGAN: 2;
    readonly CANCELLED: 3;
    readonly ACTIVE: 4;
    readonly END: 5;
};
type StateType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];
type DefaultEvent = {
    nativeEvent: {
        readonly handlerTag: number;
        readonly numberOfPointers: number;
        readonly state: (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];
        readonly x: number;
        readonly y: number;
        readonly absoluteX: number;
        readonly absoluteY: number;
        readonly translationX: number;
        readonly translationY: number;
        readonly velocityX: number;
        readonly velocityY: number;
    };
};
interface PropsUsedInUseAnimatedGestureHandler {
    handlerTag?: number;
    numberOfPointers?: number;
    state?: StateType;
    oldState?: StateType;
}
export type GestureHandlerEvent<Event extends object> = ReanimatedEvent<Event> | Event;
type GestureHandler<Event extends NativeEventWrapper<PropsUsedInUseAnimatedGestureHandler>, Context extends Record<string, unknown>> = (eventPayload: ReanimatedEvent<Event>, context: Context, isCanceledOrFailed?: boolean) => void;
export interface GestureHandlers<Event extends NativeEventWrapper<PropsUsedInUseAnimatedGestureHandler>, Context extends Record<string, unknown>> {
    [key: string]: GestureHandler<Event, Context> | undefined;
    onStart?: GestureHandler<Event, Context>;
    onActive?: GestureHandler<Event, Context>;
    onEnd?: GestureHandler<Event, Context>;
    onFail?: GestureHandler<Event, Context>;
    onCancel?: GestureHandler<Event, Context>;
    onFinish?: GestureHandler<Event, Context>;
}
/**
 * @deprecated UseAnimatedGestureHandler is an old API which is no longer
 *   supported.
 *
 *   Please check
 *   https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-2/
 *   for information about how to migrate to `react-native-gesture-handler` v2
 */
export declare function useAnimatedGestureHandler<Event extends NativeEventWrapper<PropsUsedInUseAnimatedGestureHandler> = DefaultEvent, Context extends Record<string, unknown> = Record<string, unknown>>(handlers: GestureHandlers<Event, Context>, dependencies?: DependencyList): (e: Event) => void;
export {};
//# sourceMappingURL=useAnimatedGestureHandler.d.ts.map
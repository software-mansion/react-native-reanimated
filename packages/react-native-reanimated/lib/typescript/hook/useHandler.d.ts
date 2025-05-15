import type { DependencyList, ReanimatedEvent } from './commonTypes';
interface GeneralHandler<Event extends object, Context extends Record<string, unknown>> {
    (event: ReanimatedEvent<Event>, context: Context): void;
}
type GeneralHandlers<Event extends object, Context extends Record<string, unknown>> = Record<string, GeneralHandler<Event, Context> | undefined>;
export interface UseHandlerContext<Context extends Record<string, unknown>> {
    context: Context;
    doDependenciesDiffer: boolean;
    useWeb: boolean;
}
/**
 * Lets you find out whether the event handler dependencies have changed.
 *
 * @param handlers - An object of event handlers.
 * @param dependencies - An optional array of dependencies.
 * @returns An object containing a boolean indicating whether the dependencies
 *   have changed, and a boolean indicating whether the code is running on the
 *   web.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useHandler
 */
export declare function useHandler<Event extends object, Context extends Record<string, unknown>>(handlers: GeneralHandlers<Event, Context>, dependencies?: DependencyList): UseHandlerContext<Context>;
export {};
//# sourceMappingURL=useHandler.d.ts.map
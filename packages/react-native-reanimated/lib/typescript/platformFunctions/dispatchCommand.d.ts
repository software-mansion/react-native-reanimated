import type { WrapperRef } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
type DispatchCommand = <TRef extends WrapperRef>(animatedRef: AnimatedRef<TRef>, commandName: string, args?: unknown[]) => void;
/**
 * Lets you synchronously call a command of a native component.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns)
 *   connected to the component you'd want to call the command on.
 * @param commandName - The name of the command to dispatch (e.g. `"focus"` or
 *   `"scrollToEnd"`).
 * @param args - An optional array of arguments for the command.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/dispatchCommand
 */
export declare let dispatchCommand: DispatchCommand;
export {};
//# sourceMappingURL=dispatchCommand.d.ts.map
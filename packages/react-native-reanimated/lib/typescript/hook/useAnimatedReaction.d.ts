import type { DependencyList } from './commonTypes';
/**
 * Lets you to respond to changes in a [shared
 * value](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value).
 * It's especially useful when comparing values previously stored in the shared
 * value with the current one.
 *
 * @param prepare - A function that should return a value to which you'd like to
 *   react.
 * @param react - A function that reacts to changes in the value returned by the
 *   `prepare` function.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useAnimatedReaction
 */
export declare function useAnimatedReaction<PreparedResult>(prepare: () => PreparedResult, react: (prepared: PreparedResult, previous: PreparedResult | null) => void, dependencies?: DependencyList): void;
//# sourceMappingURL=useAnimatedReaction.d.ts.map
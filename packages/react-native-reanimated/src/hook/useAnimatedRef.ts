'use strict';
import { useAnimatedRefWeb } from './useAnimatedRefBase';

/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of
 *   the reference object.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export const useAnimatedRef = useAnimatedRefWeb;

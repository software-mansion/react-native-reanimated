'use strict';

import { useEffect } from 'react';
import { startMapper, stopMapper } from "../core.js";
import { shouldBeUseWeb } from "../PlatformChecker.js";
import { useSharedValue } from "./useSharedValue.js";

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
// @ts-expect-error This overload is required by our API.

export function useAnimatedReaction(prepare, react, dependencies) {
  const previous = useSharedValue(null);
  let inputs = Object.values(prepare.__closure ?? {});
  if (shouldBeUseWeb()) {
    if (!inputs.length && dependencies?.length) {
      // let web work without a Reanimated Babel plugin
      inputs = dependencies;
    }
  }
  if (dependencies === undefined) {
    dependencies = [...Object.values(prepare.__closure ?? {}), ...Object.values(react.__closure ?? {}), prepare.__workletHash, react.__workletHash];
  } else {
    dependencies.push(prepare.__workletHash, react.__workletHash);
  }
  useEffect(() => {
    const fun = () => {
      'worklet';

      const input = prepare();
      react(input, previous.value);
      previous.value = input;
    };
    const mapperId = startMapper(fun, inputs);
    return () => {
      stopMapper(mapperId);
    };
  }, dependencies);
}
//# sourceMappingURL=useAnimatedReaction.js.map
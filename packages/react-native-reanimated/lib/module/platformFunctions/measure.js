'use strict';

import { RuntimeKind } from 'react-native-worklets';
import { IS_JEST, logger, SHOULD_BE_USE_WEB } from "../common/index.js";
/**
 * Lets you synchronously get the dimensions and position of a view on the
 * screen.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns)
 *   connected to the component you'd want to get the measurements from.
 * @returns An object containing component measurements or null when the
 *   measurement couldn't be performed- {@link MeasuredDimensions}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/measure/
 */
export let measure;
function measureNative(animatedRef) {
  'worklet';

  if (globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
    return null;
  }
  const viewTag = animatedRef();
  if (viewTag === -1) {
    logger.warn(`The view with tag ${viewTag} is not a valid argument for measure(). This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`);
    return null;
  }
  const measured = global._measure(viewTag);
  if (measured === null) {
    logger.warn(`The view has some undefined, not-yet-computed or meaningless value of \`LayoutMetrics\` type. This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`);
    return null;
  } else if (measured.x === -1234567) {
    logger.warn(`The view returned an invalid measurement response. Please make sure the view is currently rendered.`);
    return null;
  } else if (isNaN(measured.x)) {
    logger.warn(`The view gets view-flattened on Android. To disable view-flattening, set \`collapsable={false}\` on this component.`);
    return null;
  } else {
    return measured;
  }
}
function measureJest() {
  logger.warn('measure() cannot be used with Jest.');
  return null;
}
function measureDefault() {
  logger.warn('measure() is not supported on this configuration.');
  return null;
}
if (!SHOULD_BE_USE_WEB) {
  // Those assertions are actually correct since on Native platforms `AnimatedRef` is
  // mapped as a different function in `serializableMappingCache` and
  // TypeScript is not able to infer that.
  measure = measureNative;
} else if (IS_JEST) {
  measure = measureJest;
} else {
  measure = measureDefault;
}
//# sourceMappingURL=measure.js.map
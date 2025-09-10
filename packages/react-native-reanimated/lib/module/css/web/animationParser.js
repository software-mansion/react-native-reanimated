'use strict';

import { hasSuffix } from "../../common/index.js";
import { PROPERTIES_CONFIG } from "./config.js";
import { createStyleBuilder } from "./style/index.js";
import { parseTimingFunction } from "./utils.js";
const styleBuilder = createStyleBuilder(PROPERTIES_CONFIG);
export function processKeyframeDefinitions(definitions) {
  return Object.entries(definitions).reduce((acc, [timestamp, rules]) => {
    const step = hasSuffix(timestamp) ? timestamp : `${parseFloat(timestamp) * 100}%`;
    const processedBlock = processKeyframeBlock(rules);
    if (!processedBlock) {
      return acc;
    }
    acc.push(`${step} { ${processedBlock} }`);
    return acc;
  }, []).join(' ');
}
function processKeyframeBlock({
  animationTimingFunction,
  ...rules
}) {
  const style = styleBuilder.buildFrom(rules);
  if (!style) {
    return null;
  }
  return animationTimingFunction ? `animation-timing-function: ${parseTimingFunction(animationTimingFunction)}; ${style}` : style;
}
//# sourceMappingURL=animationParser.js.map
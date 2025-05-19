'use strict';

import { convertPropertyToArray, parseSingleTransitionShorthand, splitByComma } from "../../../utils/index.js";
const createEmptyTransitionConfig = () => ({
  transitionProperty: [],
  transitionDuration: [],
  transitionTimingFunction: [],
  transitionDelay: [],
  transitionBehavior: []
});
function parseTransitionShorthand(value) {
  return splitByComma(value).reduce((acc, part) => {
    const result = parseSingleTransitionShorthand(part);
    acc.transitionProperty.push(result.transitionProperty ?? 'all');
    acc.transitionDuration.push(result.transitionDuration ? String(result.transitionDuration) : '0s');
    acc.transitionTimingFunction.push(result.transitionTimingFunction ?? 'ease');
    acc.transitionDelay.push(result.transitionDelay ? String(result.transitionDelay) : '0s');
    acc.transitionBehavior.push(result.transitionBehavior ?? 'normal');
    return acc;
  }, createEmptyTransitionConfig());
}
export function normalizeCSSTransitionProperties(config) {
  const result = config.transition ? parseTransitionShorthand(config.transition) : createEmptyTransitionConfig();
  for (const [key, value] of Object.entries(config)) {
    result[key] = convertPropertyToArray(value);
  }
  return result;
}
//# sourceMappingURL=transition.js.map
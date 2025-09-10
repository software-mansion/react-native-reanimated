'use strict';

import { CSSKeyframesRuleImpl } from '../platform';
export default function keyframes(
// TODO - think of better types
keyframeDefinitions) {
  return new CSSKeyframesRuleImpl(keyframeDefinitions);
}
//# sourceMappingURL=keyframes.js.map
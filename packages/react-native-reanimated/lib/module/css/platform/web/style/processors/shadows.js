'use strict';

import { parseBoxShadowString } from "../../../../../common/index.js";
import { maybeAddSuffix } from "../../utils.js";
export const processBoxShadow = value => {
  const parsedShadow = typeof value === 'string' ? parseBoxShadowString(value) : value;
  return parsedShadow.map(({
    offsetX,
    offsetY,
    color = '#000',
    blurRadius = '',
    spreadDistance = '',
    inset = ''
  }) => [maybeAddSuffix(offsetX, 'px'), maybeAddSuffix(offsetY, 'px'), maybeAddSuffix(blurRadius, 'px'), maybeAddSuffix(spreadDistance, 'px'), color, inset ? 'inset' : ''].filter(Boolean).join(' ')).join(', ');
};
export const processShadowOffset = value => `${value.width}px ${value.height}px`;
//# sourceMappingURL=shadows.js.map
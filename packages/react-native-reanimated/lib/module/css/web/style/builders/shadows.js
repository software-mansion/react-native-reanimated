'use strict';

import { logger } from "../../../../common/index.js";
import { opacifyColor } from "../../utils.js";
import { createRuleBuilder } from "../builderFactories.js";
import { processColor } from "../processors/index.js";
const processShadowOffset = value => `${value.width}px ${value.height}px`;
export const boxShadowBuilder = createRuleBuilder({
  shadowColor: {
    process: processColor
  },
  shadowOffset: {
    process: processShadowOffset
  },
  shadowOpacity: true,
  shadowRadius: 'px'
}, ({
  shadowColor = '#000',
  shadowOffset = '0 0',
  shadowOpacity = '1',
  shadowRadius = '0'
}) => {
  const opacity = Math.min(Math.max(+shadowOpacity, 0), 1);
  const processedColor = opacity !== 1 ? opacifyColor(shadowColor, opacity) : shadowColor;
  if (!processedColor) {
    logger.warn(`Cannot apply shadowOpacity to shadowColor: ${shadowColor}`);
  }
  return {
    boxShadow: `${shadowOffset} ${shadowRadius} ${processedColor ?? shadowColor}`
  };
});
export const textShadowBuilder = createRuleBuilder({
  textShadowColor: {
    process: processColor
  },
  textShadowOffset: {
    process: processShadowOffset
  },
  textShadowRadius: 'px'
}, ({
  textShadowColor = '#000',
  textShadowOffset = '0 0',
  textShadowRadius = '0'
}) => ({
  textShadow: `${textShadowOffset} ${textShadowRadius} ${textShadowColor}`
}));
//# sourceMappingURL=shadows.js.map
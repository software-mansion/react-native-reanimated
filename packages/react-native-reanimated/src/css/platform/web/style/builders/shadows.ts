'use strict';
import type { TextStyle, ViewStyle } from 'react-native';

import type { ValueProcessor } from '../../../../../common';
import { logger } from '../../../../../common';
import { opacifyColor } from '../../utils';
import { createRuleBuilder } from '../builderFactories';
import { processColor } from '../processors';

type ShadowOffset = NonNullable<ViewStyle['shadowOffset']>;

const processShadowOffset: ValueProcessor<ShadowOffset, string> = (value) =>
  `${value.width}px ${value.height}px`;

type BoxShadowProps = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius'
>;

export const boxShadowBuilder = createRuleBuilder<BoxShadowProps>(
  {
    shadowColor: { process: processColor },
    shadowOffset: { process: processShadowOffset },
    shadowOpacity: true,
    shadowRadius: 'px',
  },
  ({
    shadowColor = '#000',
    shadowOffset = '0 0',
    shadowOpacity = '1',
    shadowRadius = '0',
  }) => {
    const opacity = Math.min(Math.max(+shadowOpacity, 0), 1);
    const processedColor =
      opacity !== 1 ? opacifyColor(shadowColor, opacity) : shadowColor;

    if (!processedColor) {
      logger.warn(`Cannot apply shadowOpacity to shadowColor: ${shadowColor}`);
    }

    return {
      boxShadow: `${shadowOffset} ${shadowRadius} ${processedColor ?? shadowColor}`,
    };
  }
);

type TextShadowProps = Pick<
  TextStyle,
  'textShadowColor' | 'textShadowOffset' | 'textShadowRadius'
>;

export const textShadowBuilder = createRuleBuilder<TextShadowProps>(
  {
    textShadowColor: { process: processColor },
    textShadowOffset: { process: processShadowOffset },
    textShadowRadius: 'px',
  },
  ({
    textShadowColor = '#000',
    textShadowOffset = '0 0',
    textShadowRadius = '0',
  }) => ({
    textShadow: `${textShadowOffset} ${textShadowRadius} ${textShadowColor}`,
  })
);

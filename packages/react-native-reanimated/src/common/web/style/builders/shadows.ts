'use strict';
import type { TextStyle, ViewStyle } from 'react-native';

import { logger } from '../../../logger';
import { opacifyColor } from '../../utils';
import { processColor } from '../processors';
import { createWebRuleBuilder } from '../ruleBuilder';
import type { ValueProcessor } from '../types';

type ShadowOffset = NonNullable<ViewStyle['shadowOffset']>;

const processShadowOffset: ValueProcessor<ShadowOffset> = (value) =>
  `${value.width}px ${value.height}px`;

type BoxShadowProps = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius'
>;

export const boxShadowBuilder = createWebRuleBuilder<BoxShadowProps>(
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

export const textShadowBuilder = createWebRuleBuilder<TextShadowProps>(
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

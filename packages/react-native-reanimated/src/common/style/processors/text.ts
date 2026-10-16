'use strict';
import type { ValueProcessor } from '../../types';

export const ERROR_MESSAGES = {
  unsupportedVerticalAlign(value: string) {
    'worklet';
    return `Unsupported verticalAlign: ${value}. Expected one of: auto, top, bottom, middle.`;
  },
};

const VERTICAL_ALIGN_TO_TEXT_ALIGN_VERTICAL: Record<string, string> = {
  auto: 'auto',
  top: 'top',
  bottom: 'bottom',
  middle: 'center',
};

export const processVerticalAlign: ValueProcessor<string> = (value) => {
  'worklet';
  if (
    !Object.prototype.hasOwnProperty.call(
      VERTICAL_ALIGN_TO_TEXT_ALIGN_VERTICAL,
      value
    )
  ) {
    throw new Error(
      `[Reanimated] ${ERROR_MESSAGES.unsupportedVerticalAlign(value)}`
    );
  }
  return { textAlignVertical: VERTICAL_ALIGN_TO_TEXT_ALIGN_VERTICAL[value] };
};

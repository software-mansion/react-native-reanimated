'use strict';
import type { TextStyle } from 'react-native';

import type { StyleProps } from '../../../commonTypes';
import type { ValueProcessor } from '../../types';

type VerticalAlign = NonNullable<TextStyle['verticalAlign']>;
type TextAlignVertical = NonNullable<TextStyle['textAlignVertical']>;

export const ERROR_MESSAGES = {
  unsupportedVerticalAlign(value: string) {
    'worklet';
    return `Unsupported verticalAlign: ${value}. Expected one of: auto, top, bottom, middle.`;
  },
};

const VERTICAL_ALIGN_TO_TEXT_ALIGN_VERTICAL = {
  auto: 'auto',
  top: 'top',
  bottom: 'bottom',
  middle: 'center',
} as const satisfies Record<VerticalAlign, TextAlignVertical>;

const TEXT_ALIGN_VERTICAL_TO_VERTICAL_ALIGN = {
  auto: 'auto',
  top: 'top',
  bottom: 'bottom',
  center: 'middle',
} as const satisfies Record<TextAlignVertical, VerticalAlign>;

export const processVerticalAlign: ValueProcessor<string, TextAlignVertical> = (
  value
) => {
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
  return {
    textAlignVertical:
      VERTICAL_ALIGN_TO_TEXT_ALIGN_VERTICAL[value as VerticalAlign],
  };
};

export function unprocessVerticalAlign(props: StyleProps) {
  const verticalAlign =
    TEXT_ALIGN_VERTICAL_TO_VERTICAL_ALIGN[
      props.textAlignVertical as TextAlignVertical
    ];
  if (verticalAlign !== undefined) {
    // @ts-ignore props is readonly
    props.verticalAlign = verticalAlign;
  }
}

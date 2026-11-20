'use strict';

// eslint-disable-next-line n/no-unpublished-import
import { StyleSheet } from 'react-native-web';

// StyleSheet(style) returns [className, inlineDOMStyle]
const resolveStyle = StyleSheet as unknown as (
  style: Record<string, unknown>,
  options: { writingDirection?: 'ltr' | 'rtl' }
) => [string, Record<string, unknown> | null | undefined, ...unknown[]];

export const createReactDOMStyle = (
  style: Record<string, unknown>,
  writingDirection?: 'ltr' | 'rtl'
): Record<string, unknown> =>
  resolveStyle(style, { writingDirection })[1] ?? {};

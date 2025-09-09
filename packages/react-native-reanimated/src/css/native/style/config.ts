'use strict';
import {
  IS_ANDROID,
  processBoxShadowNative,
  processColor,
  processTransformOrigin,
} from '../../../common';
import type { PlainStyle } from '../../types';
import {
  processAspectRatio,
  processFontWeight,
  processGap,
  processInset,
  processInsetBlock,
  processInsetInline,
  processTransform,
} from './processors';
import type { StyleBuilderConfig } from './types';

const colorAttributes = { process: processColor };

export const BASE_PROPERTIES_CONFIG: StyleBuilderConfig<PlainStyle> = {
  /** Layout and Positioning */
  // FLEXBOX
  flex: true,
  flexBasis: true,
  flexDirection: true,
  justifyContent: true,
  alignItems: true,
  alignSelf: true,
  alignContent: true,
  flexGrow: true,
  flexShrink: true,
  flexWrap: true,
  gap: { process: processGap },
  rowGap: true,
  columnGap: true,
  start: true,
  end: true,
  direction: true,

  // DIMENSIONS
  height: true,
  width: true,
  maxHeight: true,
  maxWidth: true,
  minHeight: true,
  minWidth: true,

  // MARGINS
  margin: true,
  marginTop: true,
  marginRight: true,
  marginBottom: true,
  marginLeft: true,
  marginStart: true,
  marginEnd: true,
  // TODO - check if these props should depend on layout direction
  marginBlock: { as: 'marginVertical' },
  marginBlockEnd: { as: 'marginBottom' },
  marginBlockStart: { as: 'marginTop' },
  marginInline: { as: 'marginHorizontal' },
  marginInlineEnd: { as: 'marginRight' },
  marginInlineStart: { as: 'marginLeft' },
  marginHorizontal: true,
  marginVertical: true,

  // PADDINGS
  padding: true,
  paddingTop: true,
  paddingRight: true,
  paddingBottom: true,
  paddingLeft: true,
  paddingStart: true,
  paddingEnd: true,
  // TODO - check if these props should depend on layout direction
  paddingBlock: { as: 'paddingVertical' },
  paddingBlockEnd: { as: 'paddingBottom' },
  paddingBlockStart: { as: 'paddingTop' },
  paddingInline: { as: 'paddingHorizontal' },
  paddingInlineEnd: { as: 'paddingRight' },
  paddingInlineStart: { as: 'paddingLeft' },
  paddingHorizontal: true,
  paddingVertical: true,

  // INSETS
  top: true,
  left: true,
  bottom: true,
  right: true,

  inset: { process: processInset },
  insetBlock: { process: processInsetBlock },
  insetInline: { process: processInsetInline },
  // TODO - check if these props should depend on layout direction
  insetBlockStart: { as: 'top' },
  insetBlockEnd: { as: 'bottom' },
  insetInlineStart: { as: 'left' },
  insetInlineEnd: { as: 'right' },

  // OTHERS
  position: true,
  display: true,
  overflow: true,
  zIndex: true,
  aspectRatio: { process: processAspectRatio },
  boxSizing: false, // web only

  /** Appearance */
  // COLORS
  // Background
  backgroundColor: colorAttributes,
  // Text
  color: colorAttributes,
  textDecorationColor: colorAttributes,
  textShadowColor: colorAttributes,
  // Border
  borderColor: colorAttributes,
  borderTopColor: colorAttributes,
  borderBlockStartColor: colorAttributes,
  borderRightColor: colorAttributes,
  borderEndColor: colorAttributes,
  borderBottomColor: colorAttributes,
  borderBlockEndColor: colorAttributes,
  borderLeftColor: colorAttributes,
  borderStartColor: colorAttributes,
  borderBlockColor: colorAttributes,
  // Other
  outlineColor: colorAttributes,
  shadowColor: colorAttributes,
  overlayColor: IS_ANDROID ? colorAttributes : false,
  tintColor: colorAttributes,

  // SHADOWS
  // View
  shadowOffset: !IS_ANDROID,
  shadowOpacity: !IS_ANDROID,
  shadowRadius: !IS_ANDROID,
  elevation: IS_ANDROID,
  textShadowOffset: true,
  textShadowRadius: true,
  boxShadow: { process: processBoxShadowNative },

  // BORDERS
  // Radius
  borderRadius: true,
  // top-left
  borderTopLeftRadius: true,
  borderTopStartRadius: true,
  borderStartStartRadius: true,
  // top-right
  borderTopRightRadius: true,
  borderTopEndRadius: true,
  borderStartEndRadius: true,
  // bottom-left
  borderBottomLeftRadius: true,
  borderBottomStartRadius: true,
  borderEndStartRadius: true,
  // bottom-right
  borderBottomRightRadius: true,
  borderBottomEndRadius: true,
  borderEndEndRadius: true,

  // Width
  borderWidth: true,
  // top
  borderTopWidth: true,
  borderStartWidth: true,
  // bottom
  borderBottomWidth: true,
  borderEndWidth: true,
  // left
  borderLeftWidth: true,
  // right
  borderRightWidth: true,

  // Decoration
  borderCurve: false,
  borderStyle: true,

  // OUTLINES
  outlineOffset: true,
  outlineStyle: true,
  outlineWidth: true,

  // TRANSFORMS
  transformOrigin: { process: processTransformOrigin },
  transform: { process: processTransform },

  // OTHERS
  backfaceVisibility: true,
  opacity: true,
  mixBlendMode: true,
  // eslint-disable-next-line camelcase
  experimental_backgroundImage: false, // TODO

  /** Typography */
  // Font
  fontFamily: true,
  fontSize: true,
  fontStyle: true,
  fontVariant: true,
  fontWeight: { process: processFontWeight },
  // Alignment
  textAlign: true,
  textAlignVertical: true,
  verticalAlign: false,
  // Decoration
  letterSpacing: true,
  lineHeight: true,
  textTransform: true,
  textDecorationLine: true,
  textDecorationStyle: true,
  // Others
  userSelect: true,
  writingDirection: false,
  includeFontPadding: true,

  /** Others */
  // Image
  resizeMode: true,
  objectFit: false,
  // Cursor
  cursor: true,
  pointerEvents: true,
  // Others
  filter: false, // web only
  isolation: true,
};

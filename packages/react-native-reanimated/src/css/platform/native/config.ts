import {
  processAspectRatio,
  processColor,
  processFontWeight,
  processGap,
  processInset,
  processInsetBlock,
  processInsetInline,
  processTransform,
  processTransformOrigin,
} from './style';
import type { StyleBuilderConfig } from './style';
import type { PlainStyle } from '../../types';

const colorAttributes = { process: processColor };

export const PROPERTIES_CONFIG: StyleBuilderConfig<PlainStyle> = {
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
  boxSizing: false, // TODO

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
  outlineColor: false, // TODO
  shadowColor: colorAttributes, // iOS only
  overlayColor: colorAttributes,
  tintColor: colorAttributes,

  // SHADOWS
  // View
  shadowOffset: true,
  shadowOpacity: true,
  shadowRadius: true,
  elevation: true,
  textShadowOffset: true,
  textShadowRadius: true,
  boxShadow: true,

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
  borderCurve: true,
  borderStyle: true,

  // OUTLINES
  outlineOffset: false, // TODO
  outlineStyle: false, // TODO
  outlineWidth: false, // TODO

  // TRANSFORMS
  transformOrigin: { process: processTransformOrigin },
  transform: { process: processTransform },
  transformMatrix: false, // deprecated
  rotation: false, // deprecated
  scaleX: false, // deprecated
  scaleY: false, // deprecated
  translateX: false, // deprecated
  translateY: false, // deprecated

  // OTHERS
  backfaceVisibility: true,
  opacity: true,
  mixBlendMode: false, // TODO
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
  verticalAlign: true,
  // Decoration
  letterSpacing: true,
  lineHeight: true,
  textTransform: true,
  textDecorationLine: true,
  textDecorationStyle: true,
  // Others
  userSelect: true,
  writingDirection: true,
  includeFontPadding: true,

  /** Others */
  // Image
  resizeMode: true,
  objectFit: true,
  // Cursor
  cursor: true,
  pointerEvents: true,
  // Others
  filter: false, // web only
  isolation: true,
};

export const SEPARATELY_INTERPOLATED_ARRAY_PROPERTIES = new Set([
  'transformOrigin',
]);

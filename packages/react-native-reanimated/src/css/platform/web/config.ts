import {
  processBoxShadow,
  processColor,
  processFilter,
  processFontWeight,
  processMarginHorizontal,
  processMarginVertical,
  processPaddingHorizontal,
  processPaddingVertical,
  processTransform,
  processTransformOrigin,
  boxShadowBuilder,
  textShadowBuilder,
  processFontVariant,
} from './style';
import type { StyleBuilderConfig } from './style';
import type { PlainStyle } from '../../types';

const colorAttributes = { process: processColor };

export const PROPERTIES_CONFIG: StyleBuilderConfig<PlainStyle> = {
  /** Layout and Positioning */
  // FLEXBOX
  flex: true,
  flexBasis: 'px',
  flexDirection: true,
  justifyContent: true,
  alignItems: true,
  alignSelf: true,
  alignContent: true,
  flexGrow: true,
  flexShrink: true,
  flexWrap: true,
  gap: 'px',
  rowGap: 'px',
  columnGap: 'px',
  start: false,
  end: false,
  direction: true,

  // DIMENSIONS
  height: 'px',
  width: 'px',
  maxHeight: 'px',
  maxWidth: 'px',
  minHeight: 'px',
  minWidth: 'px',

  // MARGINS
  margin: 'px',
  marginTop: 'px',
  marginRight: 'px',
  marginBottom: 'px',
  marginLeft: 'px',
  // TODO - check if these props should depend on writing direction
  marginStart: { as: 'marginLeft' },
  marginEnd: { as: 'marginRight' },
  marginBlock: 'px',
  marginBlockEnd: 'px',
  marginBlockStart: 'px',
  marginInline: 'px',
  marginInlineEnd: 'px',
  marginInlineStart: 'px',
  marginHorizontal: { process: processMarginHorizontal },
  marginVertical: { process: processMarginVertical },

  // PADDINGS
  padding: 'px',
  paddingTop: 'px',
  paddingRight: 'px',
  paddingBottom: 'px',
  paddingLeft: 'px',
  // TODO - check if these props should depend on writing direction
  paddingStart: { as: 'paddingLeft' },
  paddingEnd: { as: 'paddingRight' },
  paddingBlock: 'px',
  paddingBlockEnd: 'px',
  paddingBlockStart: 'px',
  paddingInline: 'px',
  paddingInlineEnd: 'px',
  paddingInlineStart: 'px',
  paddingHorizontal: { process: processPaddingHorizontal },
  paddingVertical: { process: processPaddingVertical },

  // INSETS
  top: 'px',
  left: 'px',
  bottom: 'px',
  right: 'px',

  inset: 'px',
  insetBlock: 'px',
  insetBlockEnd: 'px',
  insetBlockStart: 'px',
  insetInline: 'px',
  insetInlineEnd: 'px',
  insetInlineStart: 'px',

  // OTHERS
  position: true,
  display: true,
  overflow: true,
  zIndex: true,
  aspectRatio: true,
  boxSizing: false, // TODO

  /** Appearance */
  // COLORS
  // Background
  backgroundColor: colorAttributes,
  // Text
  color: colorAttributes,
  textDecorationColor: colorAttributes,
  textShadowColor: textShadowBuilder,
  // Border
  borderColor: colorAttributes,
  borderTopColor: colorAttributes,
  borderBlockStartColor: colorAttributes,
  borderRightColor: colorAttributes,
  borderEndColor: { as: 'borderRightColor' },
  borderBottomColor: colorAttributes,
  borderBlockEndColor: colorAttributes,
  borderLeftColor: colorAttributes,
  borderStartColor: { as: 'borderLeftColor' },
  borderBlockColor: colorAttributes,
  // Other
  outlineColor: false, // TODO
  shadowColor: boxShadowBuilder,
  overlayColor: colorAttributes,
  tintColor: colorAttributes,

  // SHADOWS
  // View
  shadowOffset: boxShadowBuilder,
  shadowOpacity: boxShadowBuilder,
  shadowRadius: boxShadowBuilder,
  elevation: false, // Android only
  textShadowOffset: textShadowBuilder,
  textShadowRadius: textShadowBuilder,
  boxShadow: { process: processBoxShadow },

  // BORDERS
  // Radius
  borderRadius: 'px',
  // top-left
  borderTopLeftRadius: 'px',
  borderTopStartRadius: { as: 'borderTopLeftRadius' },
  borderStartStartRadius: 'px',
  // top-right
  borderTopRightRadius: 'px',
  borderTopEndRadius: { as: 'borderTopRightRadius' },
  borderStartEndRadius: 'px',
  // bottom-left
  borderBottomLeftRadius: 'px',
  borderBottomStartRadius: { as: 'borderBottomLeftRadius' },
  borderEndStartRadius: 'px',
  // bottom-right
  borderBottomRightRadius: 'px',
  borderBottomEndRadius: { as: 'borderBottomRightRadius' },
  borderEndEndRadius: 'px',

  // Width
  borderWidth: 'px',
  // top
  borderTopWidth: 'px',
  borderStartWidth: { as: 'borderLeftWidth' },
  // bottom
  borderBottomWidth: 'px',
  borderEndWidth: { as: 'borderRightWidth' },
  // left
  borderLeftWidth: 'px',
  // right
  borderRightWidth: 'px',

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
  fontSize: 'px',
  fontStyle: true,
  fontVariant: { process: processFontVariant },
  fontWeight: { process: processFontWeight },
  // Alignment
  textAlign: true,
  textAlignVertical: true,
  verticalAlign: true,
  // Decoration
  letterSpacing: 'px',
  lineHeight: 'px',
  textTransform: true,
  textDecorationLine: true,
  textDecorationStyle: true,
  // Others
  userSelect: true,
  writingDirection: false,
  includeFontPadding: false,

  /** Others */
  // Image
  resizeMode: false,
  objectFit: false,
  // Cursor
  cursor: true,
  pointerEvents: true,
  // Others
  filter: { process: processFilter },
  isolation: true,
};

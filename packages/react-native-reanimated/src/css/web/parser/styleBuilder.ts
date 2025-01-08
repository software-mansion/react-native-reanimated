import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import {
  processBoxShadow,
  processColor,
  processFilter,
  processFontWeight,
  processTransform,
  processTransformOrigin,
} from './processors';
import type { StyleBuilderConfig } from './types';
import { createStyleBuilder } from './createStyleBuilder';

const colorAttributes = { process: processColor };

const styleBuilderConfig: StyleBuilderConfig<
  ViewStyle | TextStyle | ImageStyle
> = {
  alignContent: true,
  alignItems: true,
  alignSelf: true,
  aspectRatio: true,
  borderBottomWidth: 'px',
  borderEndWidth: 'px',
  borderLeftWidth: 'px',
  borderRightWidth: 'px',
  borderStartWidth: 'px',
  borderTopWidth: 'px',
  columnGap: 'px',
  borderWidth: 'px',
  bottom: 'px',
  direction: true,
  display: true,
  end: 'px',
  flex: true,
  flexBasis: 'px',
  flexDirection: true,
  flexGrow: true,
  flexShrink: true,
  flexWrap: true,
  gap: 'px',
  height: 'px',
  inset: 'px',
  insetBlock: 'px',
  insetBlockEnd: 'px',
  insetBlockStart: 'px',
  insetInline: 'px',
  insetInlineEnd: 'px',
  insetInlineStart: 'px',
  justifyContent: 'px',
  left: 'px',
  margin: 'px',
  marginBlock: 'px',
  marginBlockEnd: 'px',
  marginBlockStart: 'px',
  marginBottom: 'px',
  marginEnd: 'px',
  marginHorizontal: { as: 'marginInline' },
  marginInline: 'px',
  marginInlineEnd: 'px',
  marginInlineStart: 'px',
  marginLeft: 'px',
  marginRight: 'px',
  marginStart: 'px',
  marginTop: 'px',
  marginVertical: { as: 'marginBlock' },
  maxHeight: 'px',
  maxWidth: 'px',
  minHeight: 'px',
  minWidth: 'px',
  overflow: true,
  padding: 'px',
  paddingBlock: 'px',
  paddingBlockEnd: 'px',
  paddingBlockStart: 'px',
  paddingBottom: 'px',
  paddingEnd: 'px',
  paddingHorizontal: { as: 'paddingInline' },
  paddingInline: 'px',
  paddingInlineEnd: 'px',
  paddingInlineStart: 'px',
  paddingLeft: 'px',
  paddingRight: 'px',
  paddingStart: 'px',
  paddingTop: 'px',
  paddingVertical: { as: 'paddingBlock' },
  position: 'px',
  right: 'px',
  rowGap: 'px',
  start: 'px',
  top: 'px',
  width: 'px',
  zIndex: true,

  /** Transform */
  transform: { process: processTransform },
  transformOrigin: { process: processTransformOrigin },

  /** Filter */
  filter: { process: processFilter },

  /** Isolation */
  isolation: true,

  /** Shadow */
  elevation: false, // Android only
  shadowColor: false, // iOS only
  shadowOffset: false, // iOS only
  shadowOpacity: false, // iOS only
  shadowRadius: false, // iOS only

  /** BoxShadow */
  boxShadow: { process: processBoxShadow },

  /** TextShadow */
  textShadowColor: false, // iOS only
  textShadowOffset: false, // iOS only
  textShadowRadius: false, // iOS only

  /** View */
  backfaceVisibility: true,
  backgroundColor: colorAttributes,
  borderBlockColor: colorAttributes,
  borderBlockEndColor: colorAttributes,
  borderBlockStartColor: colorAttributes,
  borderBottomColor: colorAttributes,
  borderBottomEndRadius: 'px',
  borderBottomLeftRadius: 'px',
  borderBottomRightRadius: 'px',
  borderBottomStartRadius: 'px',
  borderColor: colorAttributes,
  borderCurve: true,
  borderEndColor: colorAttributes,
  borderEndEndRadius: 'px',
  borderEndStartRadius: 'px',
  borderLeftColor: colorAttributes,
  borderRadius: 'px',
  borderRightColor: colorAttributes,
  borderStartColor: colorAttributes,
  borderStartEndRadius: 'px',
  borderStartStartRadius: 'px',
  borderStyle: true,
  borderTopColor: colorAttributes,
  borderTopEndRadius: 'px',
  borderTopLeftRadius: 'px',
  borderTopRightRadius: 'px',
  borderTopStartRadius: 'px',
  cursor: true,
  opacity: true,
  pointerEvents: true,

  /** Text */
  color: colorAttributes,
  fontFamily: true,
  fontSize: 'px',
  fontStyle: true,
  fontVariant: true,
  fontWeight: { process: processFontWeight },
  includeFontPadding: true,
  letterSpacing: 'px',
  lineHeight: 'px',
  textAlign: true,
  textAlignVertical: true,
  textDecorationColor: colorAttributes,
  textDecorationLine: true,
  textDecorationStyle: true,
  textTransform: true,
  userSelect: true,
  verticalAlign: true,
  writingDirection: true,

  /** Image */
  overlayColor: colorAttributes,
  resizeMode: true,
  tintColor: colorAttributes,
  objectFit: true,
};

export default createStyleBuilder(styleBuilderConfig);

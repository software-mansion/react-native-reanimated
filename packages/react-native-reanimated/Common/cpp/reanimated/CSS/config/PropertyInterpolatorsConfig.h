#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSDimension.h>
#include <reanimated/CSS/common/values/CSSDiscreteArray.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <vector>

namespace reanimated::css {

const InterpolatorFactoriesRecord PROPERTY_INTERPOLATORS_CONFIG = []() {
  // Local constants
  const auto BLACK = CSSColor(0, 0, 0, 255);
  const auto TRANSPARENT = CSSColor::Transparent;

  // Initialize the factories
  // TODO: Add value inheritance support
  return InterpolatorFactoriesRecord{
      /**
       * Layout and Positioning
       */
      // FLEXBOX
      {"flex", value<CSSDouble>(0)},
      {"flexBasis",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
      {"flexDirection", value<CSSKeyword>("column")},
      {"justifyContent", value<CSSKeyword>("flex-start")},
      {"alignItems", value<CSSKeyword>("stretch")},
      {"alignSelf", value<CSSKeyword>("auto")},
      {"alignContent", value<CSSKeyword>("flex-start")},
      {"flexGrow", value<CSSDouble>(0)},
      {"flexShrink", value<CSSDouble>(0)},
      {"flexWrap", value<CSSKeyword>("no-wrap")},
      {"rowGap", value<CSSDimension>(RelativeTo::Self, "height", 0)},
      {"columnGap", value<CSSDimension>(RelativeTo::Self, "width", 0)},
      {"start",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
      {"end",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
      {"direction", value<CSSKeyword>("inherit")},

      // DIMENSIONS
      {"height",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
      {"width",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
      {"maxHeight",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
      {"maxWidth",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
      {"minHeight",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
      {"minWidth",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},

      // MARGINS
      // (relative to parent width)
      {"margin",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"marginTop",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"marginRight",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"marginBottom",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"marginLeft",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"marginStart",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"marginEnd",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"marginHorizontal",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"marginVertical",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},

      // PADDINGS
      // (relative to parent width)
      {"padding",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"paddingTop",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"paddingRight",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"paddingBottom",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"paddingLeft",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"paddingStart",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"paddingEnd",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"paddingHorizontal",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
      {"paddingVertical",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},

      // INSETS
      {"top",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
      {"bottom",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
      {"left",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
      {"right",
       value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},

      // OTHERS
      {"position", value<CSSKeyword>("relative")},
      {"display", value<CSSDisplay>("flex")},
      {"overflow", value<CSSKeyword>("visible")},
      {"zIndex", value<CSSInteger>(0)},
      {"aspectRatio", value<CSSDouble, CSSKeyword>("auto")},

      /**
       * Appearance
       */
      // COLORS
      // Background
      {"backgroundColor", value<CSSColor>(TRANSPARENT)},
      // Text
      {"color", value<CSSColor>(BLACK)},
      {"textDecorationColor", value<CSSColor>(BLACK)},
      {"textShadowColor", value<CSSColor>(BLACK)},
      // Border
      {"borderColor", value<CSSColor>(BLACK)},
      {"borderTopColor", value<CSSColor>(BLACK)},
      {"borderBlockStartColor", value<CSSColor>(BLACK)},
      {"borderRightColor", value<CSSColor>(BLACK)},
      {"borderEndColor", value<CSSColor>(BLACK)},
      {"borderBottomColor", value<CSSColor>(BLACK)},
      {"borderBlockEndColor", value<CSSColor>(BLACK)},
      {"borderLeftColor", value<CSSColor>(BLACK)},
      {"borderStartColor", value<CSSColor>(BLACK)},
      {"borderBlockColor", value<CSSColor>(BLACK)},
      // Other
      {"outlineColor", value<CSSColor>(BLACK)},
      {"shadowColor", value<CSSColor>(BLACK)},
      {"overlayColor", value<CSSColor>(BLACK)},
      {"tintColor", value<CSSColor>(BLACK)},

      // SHADOWS
      // View
      // iOS only
      {"shadowOffset",
       record(
           {{"width", value<CSSDouble>(0)}, {"height", value<CSSDouble>(0)}})},
      {"shadowRadius", value<CSSDouble>(0)},
      {"shadowOpacity", value<CSSDouble>(1)},
      // Android only
      {"elevation", value<CSSDouble>(0)},
      // Text
      {"textShadowOffset",
       record(
           {{"width", value<CSSDouble>(0)}, {"height", value<CSSDouble>(0)}})},
      {"textShadowRadius", value<CSSDouble>(0)},
      {"boxShadow",
       array({record({
           {"offsetX", value<CSSDouble>(0)},
           {"offsetY", value<CSSDouble>(0)},
#ifdef ANDROID
           // For some reason Android crashes when blurRadius is smaller than 1,
           // so we use a custom value type that will never be smaller than 1
           {"blurRadius", value<CSSShadowRadiusAndroid>(1)},
#else
           {"blurRadius", value<CSSDouble>(0)},
#endif
           {"spreadDistance", value<CSSDouble>(0)},
           {"color", value<CSSColor>(BLACK)},
           {"inset", value<CSSBoolean>(false)},
       })})},

      // BORDERS
      // Radius
      // TODO - fix interpolation between absolute and relative values
      // when yoga supports it (relativeProperty "width" is just a placeholder)
      {"borderRadius", value<CSSDimension>(RelativeTo::Self, "width", 0)},
      // top-left
      {"borderTopLeftRadius",
       value<CSSDimension>(RelativeTo::Self, "width", 0)},
      {"borderTopStartRadius",
       value<CSSDimension>(RelativeTo::Self, "width", 0)},
      {"borderStartStartRadius",
       value<CSSDimension>(RelativeTo::Self, "width", 0)},
      // top-right
      {"borderTopRightRadius",
       value<CSSDimension>(RelativeTo::Self, "width", 0)},
      {"borderTopEndRadius", value<CSSDimension>(RelativeTo::Self, "width", 0)},
      {"borderStartEndRadius",
       value<CSSDimension>(RelativeTo::Self, "width", 0)},
      // bottom-left
      {"borderBottomLeftRadius",
       value<CSSDimension>(RelativeTo::Self, "width", 0)},
      {"borderBottomStartRadius",
       value<CSSDimension>(RelativeTo::Self, "width", 0)},
      {"borderEndStartRadius",
       value<CSSDimension>(RelativeTo::Self, "width", 0)},
      // bottom-right
      {"borderBottomRightRadius",
       value<CSSDimension>(RelativeTo::Self, "width", 0)},
      {"borderBottomEndRadius",
       value<CSSDimension>(RelativeTo::Self, "width", 0)},
      {"borderEndEndRadius", value<CSSDimension>(RelativeTo::Self, "width", 0)},

      // Width
      {"borderWidth", value<CSSDouble>(0)},
      // top
      {"borderTopWidth", value<CSSDouble>(0)},
      {"borderStartWidth", value<CSSDouble>(0)},
      // bottom
      {"borderBottomWidth", value<CSSDouble>(0)},
      {"borderEndWidth", value<CSSDouble>(0)},
      // left
      {"borderLeftWidth", value<CSSDouble>(0)},
      // right
      {"borderRightWidth", value<CSSDouble>(0)},

      // Decoration
      {"borderStyle", value<CSSKeyword>("solid")},

      // OUTLINES
      {"outlineOffset", value<CSSDouble>(0)},
      {"outlineStyle", value<CSSKeyword>("solid")},
      {"outlineWidth", value<CSSDouble>(0)},

      // TRANSFORMS
      {"transformOrigin",
       array(
           {value<CSSDimension>(RelativeTo::Self, "width", "50%"),
            value<CSSDimension>(RelativeTo::Self, "height", "50%"),
            value<CSSDouble>(0)})},
      {"transform",
       transforms(
           {{"perspective",
             transformOp<PerspectiveOperation>(0)}, // 0 - no perspective
            {"rotate", transformOp<RotateOperation>("0deg")},
            {"rotateX", transformOp<RotateXOperation>("0deg")},
            {"rotateY", transformOp<RotateYOperation>("0deg")},
            {"rotateZ", transformOp<RotateZOperation>("0deg")},
            {"scale", transformOp<ScaleOperation>(1)},
            {"scaleX", transformOp<ScaleXOperation>(1)},
            {"scaleY", transformOp<ScaleYOperation>(1)},
            {"translateX",
             transformOp<TranslateXOperation>(RelativeTo::Self, "width", 0)},
            {"translateY",
             transformOp<TranslateYOperation>(RelativeTo::Self, "height", 0)},
            {"skewX", transformOp<SkewXOperation>("0deg")},
            {"skewY", transformOp<SkewYOperation>("0deg")},
            {"matrix",
             transformOp<MatrixOperation>(TransformMatrix::Identity())}})},

      // OTHERS
      {"backfaceVisibility", value<CSSKeyword>("visible")},
      {"opacity", value<CSSDouble>(1)},
      {"mixBlendMode", value<CSSKeyword>("normal")},

      /**
       * Typography
       */
      // Font
      {"fontFamily", value<CSSKeyword>("inherit")},
      {"fontSize", value<CSSDouble>(14)},
      {"fontStyle", value<CSSKeyword>("normal")},
      {"fontVariant",
       value<CSSDiscreteArray<CSSKeyword>>(std::vector<CSSKeyword>{})},
      {"fontWeight", value<CSSKeyword>("normal")},
      // Alignment
      {"textAlign", value<CSSKeyword>("auto")},
      {"textAlignVertical", value<CSSKeyword>("auto")},
      // Decoration
      {"letterSpacing", value<CSSDouble>(0)},
      {"lineHeight", // TODO - should inherit from fontSize
       value<CSSDouble>(14)},
      {"textTransform", value<CSSKeyword>("none")},
      {"textDecorationLine", value<CSSKeyword>("none")},
      {"textDecorationStyle", value<CSSKeyword>("solid")},
      // Others
      {"userSelect", value<CSSKeyword>("auto")},
      {"includeFontPadding", value<CSSBoolean>(false)},

      /**
       * Others
       */
      // Image
      {"resizeMode", value<CSSKeyword>("cover")},

      // Cursor
      {"cursor", value<CSSKeyword>("auto")},
      {"pointerEvents", value<CSSKeyword>("auto")},

      // Others
      {"isolation", value<CSSKeyword>("auto")},
  };
}();

} // namespace reanimated::css

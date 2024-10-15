#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated {

using namespace Interpolators;

const PropertiesInterpolatorFactories styleInterpolatorFactories = []() {
  // Local constants
  const unsigned TRANSPARENT = 0x00000000;

  // Initialize the factories
  // TODO: Set proper default values for all the interpolators
  return PropertiesInterpolatorFactories{
      // Colors
      {"backgroundColor", color(TRANSPARENT)},
      {"borderBlockColor", color(TRANSPARENT)},
      {"borderBlockEndColor", color(TRANSPARENT)},
      {"borderBlockStartColor", color(TRANSPARENT)},
      {"borderBottomColor", color(TRANSPARENT)},
      {"borderColor", color(TRANSPARENT)},
      {"borderEndColor", color(TRANSPARENT)},
      {"borderLeftColor", color(TRANSPARENT)},
      {"borderRightColor", color(TRANSPARENT)},
      {"borderStartColor", color(TRANSPARENT)},
      {"borderTopColor", color(TRANSPARENT)},
      {"color", color(TRANSPARENT)},
      {"overlayColor", color(TRANSPARENT)},
      {"shadowColor", color(TRANSPARENT)},
      {"textDecorationColor", color(TRANSPARENT)},
      {"textShadowColor", color(TRANSPARENT)},
      {"tintColor", color(TRANSPARENT)},

      // Discrete props
      {"alignContent", discrete()},
      {"alignItems", discrete()},
      {"alignTargetType::Self", discrete()},
      {"backfaceVisibility", discrete()},
      {"borderCurve", discrete()},
      {"borderStyle", discrete()},
      {"cursor", discrete()},
      {"direction", discrete()},
      {"display", discrete()},
      {"flexDirection", discrete()},
      {"flexWrap", discrete()},
      {"fontStyle", discrete()},
      {"fontVariant", discrete()},
      {"fontWeight", discrete()},
      {"includeFontPadding", discrete()},
      {"justifyContent", discrete()},
      {"objectFit", discrete()},
      {"overflow", discrete()},
      {"pointerEvents", discrete()},
      {"position", discrete()},
      {"resizeMode", discrete()},
      {"textAlign", discrete()},
      {"textAlignVertical", discrete()},
      {"textDecorationLine", discrete()},
      {"textDecorationStyle", discrete()},
      {"textTransform", discrete()},
      {"userSelect", discrete()},
      {"verticalAlign", discrete()},
      {"writingDirection", discrete()},
      {"zIndex", steps(0)},

      // Props that can have relative or numeric values
      // TODO: Check which these props should be relative to with the
      // specification
      {"borderBottomEndRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderBottomLeftRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderBottomRightRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderBottomStartRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderEndEndRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderEndStartRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderStartEndRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderStartStartRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderTopEndRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderTopLeftRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderTopRightRadius", relativeOrNumeric(RelativeTo::SELF, "width")},
      {"borderTopStartRadius", relativeOrNumeric(RelativeTo::SELF, "width")},

      {"top", relativeOrNumeric(RelativeTo::PARENT, "height", 0)},
      {"bottom", relativeOrNumeric(RelativeTo::PARENT, "height", 0)},
      {"left", relativeOrNumeric(RelativeTo::PARENT, "width", 0)},
      {"right", relativeOrNumeric(RelativeTo::PARENT, "width", 0)},

      // TODO: Somehow handle case when the value is 'auto' string
      // check if we should animate in such a case
      {"start", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"end", relativeOrNumeric(RelativeTo::PARENT, "width")},
      // TODO: This also can be auto or relative to width/height
      {"flexBasis", relativeOrNumeric(RelativeTo::PARENT, "width")},
      // TODO: This is relative to width for columns and height for rows
      {"gap", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"rowGap", relativeOrNumeric(RelativeTo::PARENT, "height")},
      {"columnGap", relativeOrNumeric(RelativeTo::PARENT, "width")},

      // Dimensions (relative to parent)
      // TODO: All of these also can have 'auto' value
      {"height", relativeOrNumeric(RelativeTo::PARENT, "height")},
      {"width", relativeOrNumeric(RelativeTo::PARENT, "width", "100%")},
      {"maxHeight", relativeOrNumeric(RelativeTo::PARENT, "height")},
      {"maxWidth", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"minHeight", relativeOrNumeric(RelativeTo::PARENT, "height")},
      {"minWidth", relativeOrNumeric(RelativeTo::PARENT, "width")},

      // Margins (relative to parent width)
      {"margin", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"marginBottom", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"marginEnd", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"marginHorizontal", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"marginLeft", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"marginRight", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"marginStart", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"marginTop", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"marginVertical", relativeOrNumeric(RelativeTo::PARENT, "width")},

      // Paddings (relative to parent width)
      {"padding", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"paddingBottom", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"paddingEnd", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"paddingHorizontal", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"paddingLeft", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"paddingRight", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"paddingStart", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"paddingTop", relativeOrNumeric(RelativeTo::PARENT, "width")},
      {"paddingVertical", relativeOrNumeric(RelativeTo::PARENT, "width")},

      // Numeric props
      {"opacity", numeric(1)},
      {"elevation", numeric()},
      {"borderBottomWidth", numeric()},
      {"borderEndWidth", numeric()},
      {"borderLeftWidth", numeric()},
      {"borderRightWidth", numeric()},
      {"borderStartWidth", numeric()},
      {"borderTopWidth", numeric()},
      {"borderWidth", numeric()},
      {"flex", numeric()},
      {"flexGrow", numeric()},
      {"flexShrink", numeric()},
      {"shadowOpacity", numeric()},
      {"shadowRadius", numeric()},
      {"textShadowRadius", numeric()},
      {"fontSize", numeric()},
      {"lineHeight", numeric()},
      {"letterSpacing", numeric()},

      // Other
      // TODO: Change to the proper interpolator
      {"aspectRatio", relativeOrNumeric(RelativeTo::SELF, "width")},

      // Complex Props (Objects)
      {"shadowOffset", object({{"width", numeric()}, {"height", numeric()}})},
      {"textShadowOffset",
       object({{"width", numeric()}, {"height", numeric()}})},

      // Transforms
      {"transform",
       transforms(
           {{"perspective", perspective(1)},
            {"rotate", rotate("0rad")},
            {"rotateX", rotate("0rad")},
            {"rotateY", rotate("0rad")},
            {"rotateZ", rotate("0rad")},
            {"scale", scale(1)},
            {"scaleX", scale(1)},
            {"scaleY", scale(1)},
            {"translateX", translate(RelativeTo::SELF, "width", 0)},
            {"translateY", translate(RelativeTo::SELF, "height", 0)},
            {"skewX", skew("0rad")},
            {"skewY", skew("0rad")},
            {"matrix", matrix(TransformMatrix::Identity())}})}};
}();

} // namespace reanimated

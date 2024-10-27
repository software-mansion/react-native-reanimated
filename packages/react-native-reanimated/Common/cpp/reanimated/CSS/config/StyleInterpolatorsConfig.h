#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated {

using namespace Interpolators;

const PropertiesInterpolatorFactories styleInterpolatorFactories = []() {
  // Local constants
  const auto BLACK = Color(0, 0, 0, 255);
  const auto TRANSPARENT = Color::Transparent;

  // Initialize the factories
  // TODO: Set proper default values for all the interpolators
  // TODO: Add value inheritance support
  return PropertiesInterpolatorFactories{
      // Colors
      {"backgroundColor", color(TRANSPARENT)},
      {"color", color(BLACK)},
      {"textDecorationColor", color(BLACK)},
      {"textShadowColor", color(BLACK)},
      {"borderColor", color(BLACK)},
      {"borderTopColor", color(BLACK)},
      {"borderRightColor", color(BLACK)},
      {"borderLeftColor", color(BLACK)},
      {"borderBottomColor", color(BLACK)},
      {"borderEndColor", color(BLACK)},
      {"borderStartColor", color(BLACK)},
      {"borderBlockColor", color(BLACK)},
      {"borderBlockEndColor", color(BLACK)},
      {"borderBlockStartColor", color(BLACK)},
      {"shadowColor", color(BLACK)},
      {"overlayColor", color(BLACK)},
      {"tintColor", color(BLACK)},

      // Discrete props
      {"alignContent", discrete()},
      {"alignItems", discrete()},
      {"alignSelf", discrete()},
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
      {"borderBottomEndRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderBottomLeftRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderBottomRightRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderBottomStartRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderEndEndRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderEndStartRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderStartEndRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderStartStartRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderTopEndRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderTopLeftRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderTopRightRadius", relOrNum(RelativeTo::SELF, "width", 0)},
      {"borderTopStartRadius", relOrNum(RelativeTo::SELF, "width", 0)},

      {"top", relOrNum(RelativeTo::PARENT, "height", 0)},
      {"bottom", relOrNum(RelativeTo::PARENT, "height", 0)},
      {"left", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"right", relOrNum(RelativeTo::PARENT, "width", 0)},

      // TODO: Somehow handle case when the value is 'auto' string
      // check if we should animate in such a case
      {"start", relOrNum(RelativeTo::PARENT, "width")},
      {"end", relOrNum(RelativeTo::PARENT, "width")},
      // TODO: This also can be auto or relative to width/height
      {"flexBasis", relOrNum(RelativeTo::PARENT, "width")},
      // TODO: This is relative to width for columns and height for rows
      {"gap", relOrNum(RelativeTo::PARENT, "width")},
      {"rowGap", relOrNum(RelativeTo::PARENT, "height")},
      {"columnGap", relOrNum(RelativeTo::PARENT, "width")},

      // Dimensions (relative to parent)
      // TODO: All of these also can have 'auto' value
      {"height", relOrNum(RelativeTo::PARENT, "height")},
      {"width", relOrNum(RelativeTo::PARENT, "width", "100%")},
      {"maxHeight", relOrNum(RelativeTo::PARENT, "height")},
      {"maxWidth", relOrNum(RelativeTo::PARENT, "width")},
      {"minHeight", relOrNum(RelativeTo::PARENT, "height")},
      {"minWidth", relOrNum(RelativeTo::PARENT, "width")},

      // Margins (relative to parent width)
      {"margin", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginTop", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginRight", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginBottom", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginLeft", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginStart", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginEnd", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginHorizontal", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginVertical", relOrNum(RelativeTo::PARENT, "width", 0)},

      // Paddings (relative to self width)
      {"padding", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingTop", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingRight", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingBottom", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingLeft", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingStart", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingEnd", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingHorizontal", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingVertical", relOrNum(RelativeTo::PARENT, "width", 0)},

      // Numeric props
      {"opacity", numeric(1)},
      {"elevation", numeric()},
      {"borderBottomWidth", numeric()},
      {"borderEndWidth", numeric()},
      {"borderLeftWidth", numeric()},
      {"borderRightWidth", numeric()},
      {"borderStartWidth", numeric()},
      {"borderTopWidth", numeric()},
      {"borderWidth", numeric(0)},
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
      {"aspectRatio", relOrNum(RelativeTo::SELF, "width")},

      // Complex Props (Objects)
      {"shadowOffset", object({{"width", numeric()}, {"height", numeric()}})},
      {"textShadowOffset",
       object({{"width", numeric()}, {"height", numeric()}})},

      // Transforms
      {"transformOrigin", transformOrigin("50%", "50%", 0)},
      {"transform",
       transforms(
           {{"perspective", perspective(0)}, // 0 means no perspective
            {"rotate", rotate("0rad")},
            {"rotateX", rotateX("0rad")},
            {"rotateY", rotateY("0rad")},
            {"rotateZ", rotateZ("0rad")},
            {"scale", scale(1)},
            {"scaleX", scaleX(1)},
            {"scaleY", scaleY(1)},
            {"translateX", translateX(RelativeTo::SELF, "width", 0)},
            {"translateY", translateY(RelativeTo::SELF, "height", 0)},
            {"skewX", skewX("0rad")},
            {"skewY", skewY("0rad")},
            {"matrix", matrix(TransformMatrix::Identity())}})},
  };
}();

} // namespace reanimated

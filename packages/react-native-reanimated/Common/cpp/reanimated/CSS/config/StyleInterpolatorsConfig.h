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
      /**
       * Layout and Positioning
       */
      // FLEXBOX
      // TODO
      {"flex", numeric()},
      {"flexDirection", discrete()},
      {"flexGrow", numeric()},
      {"flexShrink", numeric(0)},
      {"flexBasis", relOrNum(RelativeTo::PARENT, "width")},
      {"flexWrap", discrete()},
      {"justifyContent", discrete()},
      {"alignContent", discrete()},
      {"alignItems", discrete()},
      {"alignSelf", discrete()},
      // TODO: Somehow handle case when the value is 'auto' string
      // check if we should animate in such a case
      {"start", relOrNum(RelativeTo::PARENT, "width")},
      {"end", relOrNum(RelativeTo::PARENT, "width")},
      {"rowGap", relOrNum(RelativeTo::SELF, "height", 0)},
      {"columnGap", relOrNum(RelativeTo::SELF, "width", 0)},

      // DIMENSIONS
      {"height", relOrNum(RelativeTo::PARENT, "height")},
      {"width", relOrNum(RelativeTo::PARENT, "width", "100%")},
      {"maxHeight", relOrNum(RelativeTo::PARENT, "height")},
      {"maxWidth", relOrNum(RelativeTo::PARENT, "width", "100%")},
      {"minHeight", relOrNum(RelativeTo::PARENT, "height")},
      {"minWidth", relOrNum(RelativeTo::PARENT, "width")},

      // MARGINS
      // (relative to parent width)
      {"margin", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginTop", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginRight", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginBottom", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginLeft", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginStart", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginEnd", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginHorizontal", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"marginVertical", relOrNum(RelativeTo::PARENT, "width", 0)},

      // PADDINGS
      // (relative to parent width)
      {"padding", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingTop", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingRight", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingBottom", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingLeft", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingStart", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingEnd", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingHorizontal", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"paddingVertical", relOrNum(RelativeTo::PARENT, "width", 0)},

      // INSETS
      // TODO
      {"top", relOrNum(RelativeTo::PARENT, "height", 0)},
      {"bottom", relOrNum(RelativeTo::PARENT, "height", 0)},
      {"left", relOrNum(RelativeTo::PARENT, "width", 0)},
      {"right", relOrNum(RelativeTo::PARENT, "width", 0)},

      // OTHERS
      {"position", discrete()},
      {"display", discrete()},
      {"direction", discrete()},
      {"overflow", discrete()},
      {"zIndex", steps(0)},

      /**
       * Appearance
       */
      // COLORS
      // Background
      {"backgroundColor", color(TRANSPARENT)},
      // Text
      {"color", color(BLACK)},
      {"textDecorationColor", color(BLACK)}, // TODO - add example
      {"textShadowColor", color(BLACK)}, // TODO - add example
      // Border
      {"borderColor", color(BLACK)},
      {"borderTopColor", color(BLACK)},
      {"borderBlockStartColor", color(BLACK)},
      {"borderRightColor", color(BLACK)},
      {"borderEndColor", color(BLACK)},
      {"borderBottomColor", color(BLACK)},
      {"borderBlockEndColor", color(BLACK)},
      {"borderLeftColor", color(BLACK)},
      {"borderStartColor", color(BLACK)},
      {"borderBlockColor", color(BLACK)},
      // Other
      {"shadowColor", color(BLACK)},
      {"overlayColor", color(BLACK)}, // TODO - add example
      {"tintColor", color(BLACK)}, // TODO - fix (have to pass in style)

      // SHADOWS
      // View
      // iOS only
      {"shadowOpacity", numeric()},
      {"shadowRadius", numeric()},
      {"shadowOffset", object({{"width", numeric()}, {"height", numeric()}})},
      // Android only
      {"elevation", numeric()},
      // Text
      {"textShadowRadius", numeric()},
      {"textShadowOffset",
       object({{"width", numeric()}, {"height", numeric()}})},

      // BORDERS
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
      {"borderBottomWidth", numeric(0)},
      {"borderEndWidth", numeric(0)},
      {"borderLeftWidth", numeric(0)},
      {"borderRightWidth", numeric(0)},
      {"borderStartWidth", numeric(0)},
      {"borderTopWidth", numeric(0)},
      {"borderWidth", numeric(0)},
      {"borderCurve", discrete()},
      {"borderStyle", discrete()},

      // TRANSFORMS
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

      // OTHERS
      {"backfaceVisibility", discrete()},
      {"opacity", numeric(1)},

      /**
       * Typography
       */
      // FONT
      {"fontSize", numeric()},
      {"lineHeight", numeric()},
      {"letterSpacing", numeric()},
      {"fontStyle", discrete()},
      {"fontVariant", discrete()},
      {"fontWeight", discrete()},
      // Alignment
      {"textAlign", discrete()},
      {"textAlignVertical", discrete()},
      {"verticalAlign", discrete()},
      // Decoration
      {"textDecorationLine", discrete()},
      {"textDecorationStyle", discrete()},
      {"textTransform", discrete()},
      // Others
      {"userSelect", discrete()},
      {"writingDirection", discrete()},
      {"includeFontPadding", discrete()},

      /**
       * Others
       */
      // Image
      {"resizeMode", discrete()},
      // TODO: Change to the proper interpolator
      {"aspectRatio", relOrNum(RelativeTo::SELF, "width")},
      {"objectFit", discrete()},

      // Cursor
      {"cursor", discrete()},
      {"pointerEvents", discrete()},
  };
}();

} // namespace reanimated

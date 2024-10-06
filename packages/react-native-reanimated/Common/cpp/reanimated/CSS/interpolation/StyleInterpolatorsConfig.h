#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/interpolation/groups/GroupInterpolator.h>

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
      {"borderBottomEndRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderBottomLeftRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderBottomRightRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderBottomStartRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderEndEndRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderEndStartRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderStartEndRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderStartStartRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderTopEndRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderTopLeftRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderTopRightRadius", relativeOrNumeric(TargetType::SELF, "width")},
      {"borderTopStartRadius", relativeOrNumeric(TargetType::SELF, "width")},

      {"top", relativeOrNumeric(TargetType::PARENT, "height", 0)},
      {"bottom", relativeOrNumeric(TargetType::PARENT, "height", 0)},
      {"left", relativeOrNumeric(TargetType::PARENT, "width", 0)},
      {"right", relativeOrNumeric(TargetType::PARENT, "width", 0)},

      // TODO: Somehow handle case when the value is 'auto' string
      // check if we should animate in such a case
      {"start", relativeOrNumeric(TargetType::PARENT, "width")},
      {"end", relativeOrNumeric(TargetType::PARENT, "width")},
      // TODO: This also can be auto or relative to width/height
      {"flexBasis", relativeOrNumeric(TargetType::PARENT, "width")},
      // TODO: This is relative to width for columns and height for rows
      {"gap", relativeOrNumeric(TargetType::PARENT, "width")},
      {"rowGap", relativeOrNumeric(TargetType::PARENT, "height")},
      {"columnGap", relativeOrNumeric(TargetType::PARENT, "width")},

      // Dimensions (relative to parent)
      // TODO: All of these also can have 'auto' value
      {"height", relativeOrNumeric(TargetType::PARENT, "height")},
      {"width", relativeOrNumeric(TargetType::PARENT, "width", "100%")},
      {"maxHeight", relativeOrNumeric(TargetType::PARENT, "height")},
      {"maxWidth", relativeOrNumeric(TargetType::PARENT, "width")},
      {"minHeight", relativeOrNumeric(TargetType::PARENT, "height")},
      {"minWidth", relativeOrNumeric(TargetType::PARENT, "width")},

      // Margins (relative to parent width)
      {"margin", relativeOrNumeric(TargetType::PARENT, "width")},
      {"marginBottom", relativeOrNumeric(TargetType::PARENT, "width")},
      {"marginEnd", relativeOrNumeric(TargetType::PARENT, "width")},
      {"marginHorizontal", relativeOrNumeric(TargetType::PARENT, "width")},
      {"marginLeft", relativeOrNumeric(TargetType::PARENT, "width")},
      {"marginRight", relativeOrNumeric(TargetType::PARENT, "width")},
      {"marginStart", relativeOrNumeric(TargetType::PARENT, "width")},
      {"marginTop", relativeOrNumeric(TargetType::PARENT, "width")},
      {"marginVertical", relativeOrNumeric(TargetType::PARENT, "width")},

      // Paddings (relative to parent width)
      {"padding", relativeOrNumeric(TargetType::PARENT, "width")},
      {"paddingBottom", relativeOrNumeric(TargetType::PARENT, "width")},
      {"paddingEnd", relativeOrNumeric(TargetType::PARENT, "width")},
      {"paddingHorizontal", relativeOrNumeric(TargetType::PARENT, "width")},
      {"paddingLeft", relativeOrNumeric(TargetType::PARENT, "width")},
      {"paddingRight", relativeOrNumeric(TargetType::PARENT, "width")},
      {"paddingStart", relativeOrNumeric(TargetType::PARENT, "width")},
      {"paddingTop", relativeOrNumeric(TargetType::PARENT, "width")},
      {"paddingVertical", relativeOrNumeric(TargetType::PARENT, "width")},

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
      {"aspectRatio", relativeOrNumeric(TargetType::SELF, "width")},

      // Complex Props (Objects)
      {"shadowOffset", object({{"width", numeric()}, {"height", numeric()}})},
      {"textShadowOffset",
       object({{"width", numeric()}, {"height", numeric()}})},

      // Transforms
      {"transform",
       transforms({
           {"rotate", withUnit("deg", 0)},
           {"rotateX", withUnit("deg", 0)},
           {"rotateY", withUnit("deg", 0)},
           {"rotateZ", withUnit("deg", 0)},
           {"scale", numeric(1)},
           {"scaleX", numeric(1)},
           {"scaleY", numeric(1)},
           {"translateX", relativeOrNumeric(TargetType::SELF, "width", 0)},
           {"translateY", relativeOrNumeric(TargetType::SELF, "height", 0)},
           {"skewX", withUnit("deg", 0)},
           {"skewY", withUnit("deg", 0)},
           {"matrix", matrix()},
           {"perspective", numeric(0)},
       })}};
}();

} // namespace reanimated

#include <reanimated/CSS/interpolation/KeyframedStyleInterpolator.h>

namespace reanimated {

using namespace Interpolators;

KeyframedStyleInterpolator::KeyframedStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &keyframedStyle)
    : ObjectPropertiesInterpolator(rt, keyframedStyle, getFactories()) {}

const ObjectPropertiesInterpolatorFactories &
KeyframedStyleInterpolator::getFactories() {
  const unsigned TRANSPARENT = 0x00000000;

  // TODO: Set proper default values for all the interpolators
  static const ObjectPropertiesInterpolatorFactories factories = {
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
      {"borderBottomEndRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderBottomLeftRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderBottomRightRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderBottomStartRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderEndEndRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderEndStartRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderStartEndRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderStartStartRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderTopEndRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderTopLeftRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderTopRightRadius", relativeOrNumeric(TargetType::Self, "width")},
      {"borderTopStartRadius", relativeOrNumeric(TargetType::Self, "width")},

      {"top", relativeOrNumeric(TargetType::Parent, "height", 0)},
      {"bottom", relativeOrNumeric(TargetType::Parent, "height", 0)},
      {"left", relativeOrNumeric(TargetType::Parent, "width", 0)},
      {"right", relativeOrNumeric(TargetType::Parent, "width", 0)},

      // TODO: Somehow handle case when the value is 'auto' string
      // check if we should animate in such a case
      {"start", relativeOrNumeric(TargetType::Parent, "width")},
      {"end", relativeOrNumeric(TargetType::Parent, "width")},

      // TODO: This also can be auto or relative to width/height
      {"flexBasis", relativeOrNumeric(TargetType::Parent, "width")},

      // TODO: This is relative to width for columns and height for rows
      {"gap", relativeOrNumeric(TargetType::Parent, "width")},
      {"rowGap", relativeOrNumeric(TargetType::Parent, "height")},
      {"columnGap", relativeOrNumeric(TargetType::Parent, "width")},

      // Dimensions (relative to parent)
      // TODO: All of these also can have 'auto' value
      {"height", relativeOrNumeric(TargetType::Parent, "height")},
      {"width", relativeOrNumeric(TargetType::Parent, "width", "100%")},
      {"maxHeight", relativeOrNumeric(TargetType::Parent, "height")},
      {"maxWidth", relativeOrNumeric(TargetType::Parent, "width")},
      {"minHeight", relativeOrNumeric(TargetType::Parent, "height")},
      {"minWidth", relativeOrNumeric(TargetType::Parent, "width")},

      // Margins (relative to parent width)
      {"margin", relativeOrNumeric(TargetType::Parent, "width")},
      {"marginBottom", relativeOrNumeric(TargetType::Parent, "width")},
      {"marginEnd", relativeOrNumeric(TargetType::Parent, "width")},
      {"marginHorizontal", relativeOrNumeric(TargetType::Parent, "width")},
      {"marginLeft", relativeOrNumeric(TargetType::Parent, "width")},
      {"marginRight", relativeOrNumeric(TargetType::Parent, "width")},
      {"marginStart", relativeOrNumeric(TargetType::Parent, "width")},
      {"marginTop", relativeOrNumeric(TargetType::Parent, "width")},
      {"marginVertical", relativeOrNumeric(TargetType::Parent, "width")},

      // Paddings (relative to parent width)
      {"padding", relativeOrNumeric(TargetType::Parent, "width")},
      {"paddingBottom", relativeOrNumeric(TargetType::Parent, "width")},
      {"paddingEnd", relativeOrNumeric(TargetType::Parent, "width")},
      {"paddingHorizontal", relativeOrNumeric(TargetType::Parent, "width")},
      {"paddingLeft", relativeOrNumeric(TargetType::Parent, "width")},
      {"paddingRight", relativeOrNumeric(TargetType::Parent, "width")},
      {"paddingStart", relativeOrNumeric(TargetType::Parent, "width")},
      {"paddingTop", relativeOrNumeric(TargetType::Parent, "width")},
      {"paddingVertical", relativeOrNumeric(TargetType::Parent, "width")},

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
      {"aspectRatio", relativeOrNumeric(TargetType::Self, "width")},

      // Complex Props (Objects)
      {"shadowOffset",
       object({
           {"width", numeric()},
           {"height", numeric()},
       })},
      {"textShadowOffset",
       object({
           {"width", numeric()},
           {"height", numeric()},
       })},

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
           {"translateX", relativeOrNumeric(TargetType::Self, "width", 0)},
           {"translateY", relativeOrNumeric(TargetType::Self, "height", 0)},
           {"skewX", withUnit("deg", 0)},
           {"skewY", withUnit("deg", 0)},
           {"matrix", matrix()},
       })},
  };

  return factories;
}

} // namespace reanimated

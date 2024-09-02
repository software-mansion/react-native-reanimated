#include <reanimated/CSS/interpolation/KeyframedStyleInterpolator.h>

namespace reanimated {

KeyframedStyleInterpolator::KeyframedStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &keyframedStyle)
    : ObjectPropertiesInterpolator(rt, keyframedStyle, getFactories()) {}

const ObjectPropertiesInterpolatorFactories &
KeyframedStyleInterpolator::getFactories() {
  // Define shorthands within the lambda to keep them scoped
  auto color = InterpolatorFactory::color;
  auto discreteString = InterpolatorFactory::discreteString;
  auto discreteNumber = InterpolatorFactory::discreteNumber;
  auto numeric = InterpolatorFactory::numeric;
  auto withUnit = InterpolatorFactory::withUnit;
  auto relOrNum = InterpolatorFactory::relativeOrNumeric;
  auto matrix = InterpolatorFactory::matrix;
  auto object = InterpolatorFactory::object;
  auto transforms = InterpolatorFactory::transforms;

  static const ObjectPropertiesInterpolatorFactories factories = {
      // Colors
      {"backgroundColor", color},
      {"borderBlockColor", color},
      {"borderBlockEndColor", color},
      {"borderBlockStartColor", color},
      {"borderBottomColor", color},
      {"borderColor", color},
      {"borderEndColor", color},
      {"borderLeftColor", color},
      {"borderRightColor", color},
      {"borderStartColor", color},
      {"borderTopColor", color},
      {"color", color},
      {"overlayColor", color},
      {"shadowColor", color},
      {"textDecorationColor", color},
      {"textShadowColor", color},
      {"tintColor", color},

      // Discrete props
      {"alignContent", discreteString},
      {"alignItems", discreteString},
      {"alignSelf", discreteString},
      {"backfaceVisibility", discreteString},
      {"borderCurve", discreteString},
      {"borderStyle", discreteString},
      {"cursor", discreteString},
      {"direction", discreteString},
      {"display", discreteString},
      {"flexDirection", discreteString},
      {"flexWrap", discreteString},
      {"fontStyle", discreteString},
      {"fontVariant", discreteString},
      {"fontWeight", discreteString},
      {"includeFontPadding", discreteString},
      {"justifyContent", discreteString},
      {"objectFit", discreteString},
      {"overflow", discreteString},
      {"pointerEvents", discreteString},
      {"position", discreteString},
      {"resizeMode", discreteString},
      {"textAlign", discreteString},
      {"textAlignVertical", discreteString},
      {"textDecorationLine", discreteString},
      {"textDecorationStyle", discreteString},
      {"textTransform", discreteString},
      {"userSelect", discreteString},
      {"verticalAlign", discreteString},
      {"writingDirection", discreteString},
      {"zIndex", discreteNumber},

      // Props that can have relative or numeric values
      // TODO: Check which these props should be relative to with the
      // specification
      {"borderBottomEndRadius", relOrNum(TargetType::Self, "width")},
      {"borderBottomLeftRadius", relOrNum(TargetType::Self, "width")},
      {"borderBottomRightRadius", relOrNum(TargetType::Self, "width")},
      {"borderBottomStartRadius", relOrNum(TargetType::Self, "width")},
      {"borderEndEndRadius", relOrNum(TargetType::Self, "width")},
      {"borderEndStartRadius", relOrNum(TargetType::Self, "width")},
      {"borderRadius", relOrNum(TargetType::Self, "width")},
      {"borderStartEndRadius", relOrNum(TargetType::Self, "width")},
      {"borderStartStartRadius", relOrNum(TargetType::Self, "width")},
      {"borderTopEndRadius", relOrNum(TargetType::Self, "width")},
      {"borderTopLeftRadius", relOrNum(TargetType::Self, "width")},
      {"borderTopRightRadius", relOrNum(TargetType::Self, "width")},
      {"borderTopStartRadius", relOrNum(TargetType::Self, "width")},

      {"top", relOrNum(TargetType::Parent, "height")},
      {"bottom", relOrNum(TargetType::Parent, "height")},
      {"left", relOrNum(TargetType::Parent, "width")},
      {"right", relOrNum(TargetType::Parent, "width")},

      // TODO: Somehow handle case when the value is 'auto' string
      // check if we should animate in such a case
      {"start", relOrNum(TargetType::Parent, "width")},
      {"end", relOrNum(TargetType::Parent, "width")},

      // TODO: This also can be auto or relative to width/height
      {"flexBasis", relOrNum(TargetType::Parent, "width")},

      // TODO: This is relative to width for columns and height for rows
      {"gap", relOrNum(TargetType::Parent, "width")},
      {"rowGap", relOrNum(TargetType::Parent, "height")},
      {"columnGap", relOrNum(TargetType::Parent, "width")},

      // Dimensions (relative to parent)
      // TODO: All of these also can have 'auto' value
      {"height", relOrNum(TargetType::Parent, "height")},
      {"width", relOrNum(TargetType::Parent, "width")},
      {"maxHeight", relOrNum(TargetType::Parent, "height")},
      {"maxWidth", relOrNum(TargetType::Parent, "width")},
      {"minHeight", relOrNum(TargetType::Parent, "height")},
      {"minWidth", relOrNum(TargetType::Parent, "width")},

      // Margins (relative to parent width)
      {"margin", relOrNum(TargetType::Parent, "width")},
      {"marginBottom", relOrNum(TargetType::Parent, "width")},
      {"marginEnd", relOrNum(TargetType::Parent, "width")},
      {"marginHorizontal", relOrNum(TargetType::Parent, "width")},
      {"marginLeft", relOrNum(TargetType::Parent, "width")},
      {"marginRight", relOrNum(TargetType::Parent, "width")},
      {"marginStart", relOrNum(TargetType::Parent, "width")},
      {"marginTop", relOrNum(TargetType::Parent, "width")},
      {"marginVertical", relOrNum(TargetType::Parent, "width")},

      // Paddings (relative to parent width)
      {"padding", relOrNum(TargetType::Parent, "width")},
      {"paddingBottom", relOrNum(TargetType::Parent, "width")},
      {"paddingEnd", relOrNum(TargetType::Parent, "width")},
      {"paddingHorizontal", relOrNum(TargetType::Parent, "width")},
      {"paddingLeft", relOrNum(TargetType::Parent, "width")},
      {"paddingRight", relOrNum(TargetType::Parent, "width")},
      {"paddingStart", relOrNum(TargetType::Parent, "width")},
      {"paddingTop", relOrNum(TargetType::Parent, "width")},
      {"paddingVertical", relOrNum(TargetType::Parent, "width")},

      // Numeric props
      {"opacity", numeric},
      {"elevation", numeric},
      {"borderBottomWidth", numeric},
      {"borderEndWidth", numeric},
      {"borderLeftWidth", numeric},
      {"borderRightWidth", numeric},
      {"borderStartWidth", numeric},
      {"borderTopWidth", numeric},
      {"borderWidth", numeric},
      {"flex", numeric},
      {"flexGrow", numeric},
      {"flexShrink", numeric},
      {"shadowOpacity", numeric},
      {"shadowRadius", numeric},
      {"textShadowRadius", numeric},
      {"fontSize", numeric},
      {"lineHeight", numeric},
      {"letterSpacing", numeric},

      // Other
      // TODO: Change to the proper interpolator
      {"aspectRatio", relOrNum(TargetType::Self, "width")},

      // Complex Props (Objects)
      {"shadowOffset",
       object({
           {"width", numeric},
           {"height", numeric},
       })},
      {"textShadowOffset",
       object({
           {"width", numeric},
           {"height", numeric},
       })},

      // Transforms
      {"transform",
       transforms({
           {"rotate", withUnit},
           {"rotateX", withUnit},
           {"rotateY", withUnit},
           {"rotateZ", withUnit},
           {"scale", numeric},
           {"scaleX", numeric},
           {"scaleY", numeric},
           {"translateX", relOrNum(TargetType::Self, "width")},
           {"translateY", relOrNum(TargetType::Self, "height")},
           {"skewX", withUnit},
           {"skewY", withUnit},
           {"matrix", matrix},
       })},
  };

  return factories;
}

} // namespace reanimated

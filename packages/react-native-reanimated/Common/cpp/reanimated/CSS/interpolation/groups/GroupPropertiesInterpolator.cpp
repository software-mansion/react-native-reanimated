#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>

namespace reanimated::css {

GroupPropertiesInterpolator::GroupPropertiesInterpolator(
    const PropertyPath &propertyPath)
    : PropertyInterpolator(propertyPath) {}

folly::dynamic GroupPropertiesInterpolator::getStyleValue(
    const PropertyInterpolatorUpdateContext &context) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.getStyleValue(context);
      });
}

folly::dynamic GroupPropertiesInterpolator::getResetStyle(
    const PropertyInterpolatorUpdateContext &context) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.getResetStyle(context);
      });
}

folly::dynamic GroupPropertiesInterpolator::getFirstKeyframeValue() const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.getFirstKeyframeValue();
      });
}

folly::dynamic GroupPropertiesInterpolator::getLastKeyframeValue() const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.getLastKeyframeValue();
      });
}

folly::dynamic GroupPropertiesInterpolator::interpolate(
    const PropertyInterpolatorUpdateContext &context) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.interpolate(context);
      });
}

} // namespace reanimated::css

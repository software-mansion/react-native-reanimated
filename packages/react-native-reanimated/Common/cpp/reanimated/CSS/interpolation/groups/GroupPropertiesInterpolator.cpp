#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>

namespace reanimated::css {

GroupPropertiesInterpolator::GroupPropertiesInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : PropertyInterpolator(propertyPath, viewStylesRepository) {}

folly::dynamic GroupPropertiesInterpolator::getStyleValue(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.getStyleValue(shadowNode);
      });
}

folly::dynamic GroupPropertiesInterpolator::getResetStyle(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.getResetStyle(shadowNode);
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
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.interpolate(shadowNode, progressProvider);
      });
}

} // namespace reanimated::css

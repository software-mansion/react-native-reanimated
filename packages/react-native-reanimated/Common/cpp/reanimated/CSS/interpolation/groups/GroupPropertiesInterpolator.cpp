#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>

namespace reanimated {

GroupPropertiesInterpolator::GroupPropertiesInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : PropertyInterpolator(propertyPath, viewStylesRepository) {}

folly::dynamic GroupPropertiesInterpolator::getStyleValue(
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.getStyleValue(shadowNode);
      });
}

folly::dynamic GroupPropertiesInterpolator::getResetStyle(
    const ShadowNode::Shared &shadowNode) const {
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
    const ShadowNode::Shared &shadowNode,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.interpolate(shadowNode, progressProvider);
      });
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

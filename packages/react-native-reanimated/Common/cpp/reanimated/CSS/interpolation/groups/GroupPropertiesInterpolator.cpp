#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>

namespace reanimated {

GroupPropertiesInterpolator::GroupPropertiesInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : PropertyInterpolator(
          propertyPath,
          progressProvider,
          viewStylesRepository) {}

void GroupPropertiesInterpolator::setProgressProvider(
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider) {
  PropertyInterpolator::setProgressProvider(progressProvider);
  forEachInterpolator([&](PropertyInterpolator &interpolator) -> void {
    interpolator.setProgressProvider(progressProvider);
  });
}

folly::dynamic GroupPropertiesInterpolator::getStyleValue(
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.getStyleValue(shadowNode);
      });
}

folly::dynamic GroupPropertiesInterpolator::getCurrentValue(
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.getCurrentValue(shadowNode);
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

folly::dynamic GroupPropertiesInterpolator::update(
    const ShadowNode::Shared &shadowNode) {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.update(shadowNode);
      });
}

folly::dynamic GroupPropertiesInterpolator::reset(
    const ShadowNode::Shared &shadowNode) {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.reset(shadowNode);
      });
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

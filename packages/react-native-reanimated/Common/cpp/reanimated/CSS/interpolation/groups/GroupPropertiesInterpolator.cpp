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

jsi::Value GroupPropertiesInterpolator::getStyleValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.getStyleValue(rt, shadowNode);
      });
}

folly::dynamic GroupPropertiesInterpolator::getStyleValue(
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(
      [&](PropertyInterpolator &interpolator) -> folly::dynamic {
        return interpolator.getStyleValue(shadowNode);
      });
}

jsi::Value GroupPropertiesInterpolator::getCurrentValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.getCurrentValue(rt, shadowNode);
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

jsi::Value GroupPropertiesInterpolator::getLastKeyframeValue(
    jsi::Runtime &rt) const {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.getLastKeyframeValue(rt);
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

jsi::Value GroupPropertiesInterpolator::reset(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.reset(rt, shadowNode);
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

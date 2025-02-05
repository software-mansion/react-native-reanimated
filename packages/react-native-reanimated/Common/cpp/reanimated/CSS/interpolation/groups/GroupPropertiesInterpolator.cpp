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
    // TODO
      return folly::dynamic();
//  return mapInterpolators(
//      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
//        return interpolator.getStyleValue(rt, shadowNode);
//      });
}

jsi::Value GroupPropertiesInterpolator::getCurrentValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.getCurrentValue(rt, shadowNode);
      });
}

jsi::Value GroupPropertiesInterpolator::getFirstKeyframeValue(
    jsi::Runtime &rt) const {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.getFirstKeyframeValue(rt);
      });
}

jsi::Value GroupPropertiesInterpolator::getLastKeyframeValue(
    jsi::Runtime &rt) const {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.getLastKeyframeValue(rt);
      });
}

jsi::Value GroupPropertiesInterpolator::update(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.update(rt, shadowNode);
      });
}

folly::dynamic GroupPropertiesInterpolator::update(
    const ShadowNode::Shared &shadowNode) {
    // TODO
      return folly::dynamic();
//  return mapInterpolators(
//      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
//        return interpolator.update(rt, shadowNode);
//      });
}

jsi::Value GroupPropertiesInterpolator::reset(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.reset(rt, shadowNode);
      });
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

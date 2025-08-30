#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>

namespace reanimated::css {

AnimationStyleInterpolator::AnimationStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Value &keyframes,
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : RecordPropertiesInterpolator(
          getComponentInterpolators(componentName),
          {},
          viewStylesRepository) {
  updateKeyframes(rt, keyframes);
}

folly::dynamic AnimationStyleInterpolator::interpolate(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const {
  return RecordPropertiesInterpolator::interpolate(
      shadowNode, progressProvider, 0.5);
}

} // namespace reanimated::css

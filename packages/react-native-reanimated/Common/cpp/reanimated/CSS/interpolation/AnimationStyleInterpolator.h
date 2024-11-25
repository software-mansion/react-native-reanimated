#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/StyleInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <memory>

namespace reanimated {

// We can just re-use the logic from the ObjectPropertiesInterpolator class as
// interpolating multiple properties from the view style during animation is the
// same as interpolating object properties
class AnimationStyleInterpolator : public ObjectPropertiesInterpolator {
 public:
  explicit AnimationStyleInterpolator(
      const std::shared_ptr<AnimationProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      : ObjectPropertiesInterpolator(
            styleInterpolatorFactories,
            {},
            progressProvider,
            viewStylesRepository) {}

  jsi::Value getCurrentInterpolationStyle(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const {
    return getCurrentValue(rt, shadowNode);
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

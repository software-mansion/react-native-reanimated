#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/PropertyInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <memory>

namespace reanimated {

// We can just re-use the logic from the RecordPropertiesInterpolator class as
// interpolating multiple properties from the view style during animation is the
// same as interpolating record properties
class AnimationStyleInterpolator : public RecordPropertiesInterpolator {
 public:
  explicit AnimationStyleInterpolator(
      const std::shared_ptr<AnimationProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      : RecordPropertiesInterpolator(
            PROPERTY_INTERPOLATORS_CONFIG,
            {},
            progressProvider,
            viewStylesRepository) {}

  jsi::Value getCurrentInterpolationStyle(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const {
    return getCurrentValue(rt, shadowNode);
  }
  
  folly::dynamic getCurrentInterpolationStyle(
      const ShadowNode::Shared &shadowNode) const {
    return getCurrentValue(shadowNode);
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

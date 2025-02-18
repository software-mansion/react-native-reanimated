#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/PropertyInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

#include <memory>

namespace reanimated {

// We can just re-use the logic from the RecordPropertiesInterpolator class as
// interpolating multiple properties from the view style during animation is the
// same as interpolating record properties
class AnimationStyleInterpolator : public RecordPropertiesInterpolator {
 public:
  explicit AnimationStyleInterpolator(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      : RecordPropertiesInterpolator(
            PROPERTY_INTERPOLATORS_CONFIG,
            {},
            viewStylesRepository) {}
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

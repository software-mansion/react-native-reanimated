#pragma once

#include <reanimated/CSS/config/interpolators/registry.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

#include <memory>

namespace reanimated::css {

// We can just re-use the logic from the RecordPropertiesInterpolator class as
// interpolating multiple properties from the view style during animation is the
// same as interpolating record properties
class AnimationStyleInterpolator : public RecordPropertiesInterpolator {
 public:
  explicit AnimationStyleInterpolator(
      const folly::dynamic &keyframes,
      const std::string &componentName,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      : RecordPropertiesInterpolator(
            // TODO - use hasInterpolators check and show error if there are no
            // interpolators for the component
            {},
            {},
            viewStylesRepository) {
    updateKeyframes(keyframes);
  }
};

} // namespace reanimated::css

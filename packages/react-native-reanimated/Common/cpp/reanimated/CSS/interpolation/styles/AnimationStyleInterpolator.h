#pragma once

#include <reanimated/CSS/config/interpolators/registry.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

#include <memory>
#include <string>

namespace reanimated::css {

// We can just re-use the logic from the RecordPropertiesInterpolator class as
// interpolating multiple properties from the view style during animation is the
// same as interpolating record properties
class AnimationStyleInterpolator : public RecordPropertiesInterpolator {
 public:
  explicit AnimationStyleInterpolator(
      jsi::Runtime &rt,
      const jsi::Value &keyframes,
      const std::string &componentName,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      : RecordPropertiesInterpolator(
            getInterpolators(componentName),
            {},
            viewStylesRepository) {
    updateKeyframes(rt, keyframes);
  }
};

} // namespace reanimated::css

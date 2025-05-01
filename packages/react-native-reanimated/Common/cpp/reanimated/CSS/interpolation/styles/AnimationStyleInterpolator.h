#pragma once

#include <reanimated/CSS/config/PropertyInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

#include <memory>

namespace reanimated::css {

// We can just re-use the logic from the RecordPropertiesInterpolator class as
// interpolating multiple properties from the view style during animation is the
// same as interpolating record properties
class AnimationStyleInterpolator : public RecordPropertiesInterpolator {
 public:
  AnimationStyleInterpolator()
      : RecordPropertiesInterpolator(PROPERTY_INTERPOLATORS_CONFIG, {}) {}
};

} // namespace reanimated::css

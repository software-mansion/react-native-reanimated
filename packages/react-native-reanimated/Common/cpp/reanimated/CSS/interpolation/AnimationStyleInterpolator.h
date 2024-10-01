#pragma once

#include <reanimated/CSS/interpolation/StyleInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

// We can just re-use the logic from the ObjectPropertiesInterpolator class as
// interpolating multiple properties from the view style during animation is the
// same as interpolating object properties
class AnimationStyleInterpolator : public ObjectPropertiesInterpolator {
 public:
  AnimationStyleInterpolator(
      jsi::Runtime &rt,
      const jsi::Object &object,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      : ObjectPropertiesInterpolator(
            rt,
            object,
            styleInterpolatorFactories,
            viewStylesRepository,
            std::vector<std::string>()) {}
};

} // namespace reanimated

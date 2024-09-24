#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

class KeyframedStyleInterpolator : public ObjectPropertiesInterpolator {
 public:
  KeyframedStyleInterpolator(
      jsi::Runtime &rt,
      const jsi::Object &keyframedStyle);

 private:
  static const ObjectPropertiesInterpolatorFactories &getFactories();
};

} // namespace reanimated

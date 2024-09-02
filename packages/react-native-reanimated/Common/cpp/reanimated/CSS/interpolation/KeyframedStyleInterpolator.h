#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_map>

using namespace facebook;

namespace reanimated {

class KeyframedStyleInterpolator : public ObjectPropertiesInterpolator {
 public:
  KeyframedStyleInterpolator(
      jsi::Runtime &rt,
      const jsi::Object &keyframedStyle);

  jsi::Value update(jsi::Runtime &rt, double progress) override;

 private:
  static const ObjectPropertiesInterpolatorFactories &getFactories();
};

} // namespace reanimated

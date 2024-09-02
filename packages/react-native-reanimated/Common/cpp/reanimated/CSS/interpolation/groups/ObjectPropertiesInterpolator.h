#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_map>

using namespace facebook;

namespace reanimated {

using ObjectPropertiesInterpolatorFactories =
    std::unordered_map<std::string, InterpolatorFactoryFunction>;
using ObjectPropertiesInterpolators =
    std::unordered_map<std::string, std::shared_ptr<Interpolator>>;

class ObjectPropertiesInterpolator : public Interpolator {
 public:
  ObjectPropertiesInterpolator(
      jsi::Runtime &rt,
      const jsi::Object &object,
      const ObjectPropertiesInterpolatorFactories &factories);

  jsi::Value update(jsi::Runtime &rt, double progress);

 private:
  const ObjectPropertiesInterpolators interpolators_;

  ObjectPropertiesInterpolators build(
      jsi::Runtime &rt,
      const jsi::Object &object,
      const ObjectPropertiesInterpolatorFactories &factories);
};

} // namespace reanimated

#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_map>

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
      const ObjectPropertiesInterpolatorFactories &factories,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::vector<std::string> &propertyPath);

  jsi::Value update(const InterpolationUpdateContext context) override;

  jsi::Value reset(const InterpolationUpdateContext context) override;

 private:
  const ObjectPropertiesInterpolators interpolators_;

  ObjectPropertiesInterpolators build(
      jsi::Runtime &rt,
      const jsi::Object &object,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const ObjectPropertiesInterpolatorFactories &factories);
};

} // namespace reanimated

#pragma once

#include <reanimated/CSS/interpolation/groups/GroupInterpolator.h>

#include <unordered_map>

namespace reanimated {

using ObjectPropertiesInterpolatorFactories =
    std::unordered_map<std::string, InterpolatorFactoryFunction>;
using ObjectPropertiesInterpolators =
    std::unordered_map<std::string, std::shared_ptr<Interpolator>>;

class ObjectPropertiesInterpolator : public GroupInterpolator {
 public:
  ObjectPropertiesInterpolator(
      jsi::Runtime &rt,
      const jsi::Object &object,
      const ObjectPropertiesInterpolatorFactories &factories,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::vector<std::string> &propertyPath);

 protected:
  jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      std::function<jsi::Value(Interpolator &)> callback) const override;

 private:
  const ObjectPropertiesInterpolators interpolators_;

  ObjectPropertiesInterpolators build(
      jsi::Runtime &rt,
      const jsi::Object &object,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const ObjectPropertiesInterpolatorFactories &factories);
};

} // namespace reanimated

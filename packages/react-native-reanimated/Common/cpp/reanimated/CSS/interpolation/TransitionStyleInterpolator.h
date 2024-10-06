#pragma once

#include <reanimated/CSS/interpolation/StyleInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

using PropertyNames = std::vector<std::string>;

class TransitionStyleInterpolator {
 public:
  TransitionStyleInterpolator(
      const PropertyNames &propertyNames,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  void addProperties(const PropertyNames &propertyNames);
  void removeProperties(const PropertyNames &propertyNames);
  jsi::Value update(
      const std::unordered_map<std::string, InterpolationUpdateContext>
          &contexts);

 private:
  PropertiesInterpolators interpolators_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertiesInterpolators build(
      const PropertyNames &propertyNames,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  std::shared_ptr<Interpolator> createInterpolator(
      const std::string &propertyName);
};

} // namespace reanimated

#pragma once

#include <reanimated/CSS/interpolation/StyleInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

class TransitionStyleInterpolator {
 public:
  TransitionStyleInterpolator(
      const std::vector<std::string> &propertyNames,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  void updateProperties(const std::vector<std::string> &propertyNames);
  jsi::Value update(
      const std::unordered_map<std::string, InterpolationUpdateContext>
          &contexts);

 private:
  PropertiesInterpolators interpolators_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertiesInterpolators build(
      const std::vector<std::string> &propertyNames,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  void addProperty(const std::string &propertyName);
  void removeProperty(const std::string &propertyName);

  std::shared_ptr<Interpolator> createInterpolator(
      const std::string &propertyName);
};

} // namespace reanimated

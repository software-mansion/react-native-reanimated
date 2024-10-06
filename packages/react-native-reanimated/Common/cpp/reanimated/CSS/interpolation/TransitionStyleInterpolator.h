#pragma once

#include <reanimated/CSS/interpolation/StyleInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

class TransitionStyleInterpolator {
 public:
  TransitionStyleInterpolator(
      jsi::Runtime &rt,
      const jsi::Array &propertyNames,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  std::vector<std::string> getPropertyNames() const {
    return propertyNames_;
  }

  void updateProperties(jsi::Runtime &rt, const jsi::Array &propertyNames);
  jsi::Value update(
      jsi::Runtime &rt,
      const std::unordered_map<std::string, InterpolationUpdateContext>
          &contexts);

 private:
  ObjectPropertiesInterpolators interpolators_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  std::vector<std::string> propertyNames_;

  ObjectPropertiesInterpolators build(
      jsi::Runtime &rt,
      const jsi::Array &propertyNames,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  void addProperty(jsi::Runtime &rt, const std::string &propertyName);
  void removeProperty(const std::string &propertyName);

  // std::shared_ptr<Interpolator> createInterpolator(
  //     jsi::Runtime &rt,
  //     const std::string &propertyName);
};

} // namespace reanimated

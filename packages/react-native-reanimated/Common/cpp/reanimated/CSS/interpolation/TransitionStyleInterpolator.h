#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/StyleInterpolatorsConfig.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

class TransitionStyleInterpolator {
 public:
  TransitionStyleInterpolator(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  void addProperties(const PropertyNames &propertyNames);
  void removeProperties(const PropertyNames &propertyNames);
  void updateProperties(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &changedPropValues);

  jsi::Value update(
      const std::unordered_map<std::string, InterpolationUpdateContext>
          &contexts);

 private:
  PropertiesInterpolators interpolators_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  std::shared_ptr<Interpolator> createInterpolator(
      const std::string &propertyName,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const;
};

} // namespace reanimated

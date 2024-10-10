#pragma once

#include <reanimated/CSS/util/interpolators.h>

#include <unordered_map>

namespace reanimated {

using PropertiesInterpolators =
    std::unordered_map<std::string, std::shared_ptr<Interpolator>>;

class GroupInterpolator : public Interpolator {
 public:
  GroupInterpolator(
      const PropertiesInterpolatorFactories &factories,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath);

  jsi::Value getCurrentValue(jsi::Runtime &rt) const override;
  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;

  jsi::Value update(const InterpolationUpdateContext context) override;

 protected:
  const PropertiesInterpolatorFactories &factories_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertiesInterpolators interpolators_;

  virtual jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      std::function<jsi::Value(Interpolator &)> callback) const = 0;
};

} // namespace reanimated

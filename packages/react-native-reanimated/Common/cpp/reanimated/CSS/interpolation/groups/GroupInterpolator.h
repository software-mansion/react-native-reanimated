#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

#include <unordered_map>

namespace reanimated {

using PropertiesInterpolatorFactories =
    std::unordered_map<std::string, InterpolatorFactoryFunction>;
using PropertiesInterpolators =
    std::unordered_map<std::string, std::shared_ptr<Interpolator>>;

class GroupInterpolator : public Interpolator {
 public:
  GroupInterpolator(
      const PropertiesInterpolatorFactories &factories,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::vector<std::string> &propertyPath);

  jsi::Value update(const InterpolationUpdateContext context) override;
  jsi::Value getBackwardsFillValue(jsi::Runtime &rt) const override;
  jsi::Value getForwardsFillValue(jsi::Runtime &rt) const override;
  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;

 protected:
  const PropertiesInterpolatorFactories &factories_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertiesInterpolators interpolators_;

  virtual jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      std::function<jsi::Value(Interpolator &)> callback) const = 0;

  void addOrUpdateInterpolator(
      jsi::Runtime &rt,
            const ShadowNode::Shared &shadowNode,
      const std::string &propertyName,
      const jsi::Value &keyframes);
};

} // namespace reanimated

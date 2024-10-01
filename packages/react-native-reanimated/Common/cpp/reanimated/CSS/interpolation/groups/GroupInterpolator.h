#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

#include <string>

namespace reanimated {

class GroupInterpolator : public Interpolator {
 public:
  GroupInterpolator(const std::vector<std::string> &propertyPath);

  jsi::Value update(const InterpolationUpdateContext context) override;
  jsi::Value getBackwardsFillValue(jsi::Runtime &rt) const override;
  jsi::Value getForwardsFillValue(jsi::Runtime &rt) const override;
  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;

 protected:
  virtual jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      std::function<jsi::Value(Interpolator &)> callback) const = 0;
};

} // namespace reanimated

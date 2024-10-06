#pragma once

#include <reanimated/CSS/interpolation/groups/GroupInterpolator.h>

namespace reanimated {

class ObjectPropertiesInterpolator : public GroupInterpolator {
 public:
  using GroupInterpolator::GroupInterpolator;

  void updateKeyframes(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &keyframes) override;

 protected:
  jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      std::function<jsi::Value(Interpolator &)> callback) const override;
};

} // namespace reanimated

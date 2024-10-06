#pragma once

#include <reanimated/CSS/interpolation/groups/GroupInterpolator.h>
#include <reanimated/CSS/util/props.h>

#include <vector>

namespace reanimated {

class TransformsStyleInterpolator : public GroupInterpolator {
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

 private:
  std::vector<std::string> orderedPropertyNames_;
};

} // namespace reanimated

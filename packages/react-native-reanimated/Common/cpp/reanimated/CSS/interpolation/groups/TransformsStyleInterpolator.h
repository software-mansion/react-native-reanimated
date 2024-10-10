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
  void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) override;

 protected:
  jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      std::function<jsi::Value(Interpolator &)> callback) const override;

 private:
  PropertyNames orderedPropertyNames_;
};

} // namespace reanimated

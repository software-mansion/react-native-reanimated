#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class TransformsStyleInterpolator : public PropertyInterpolator {
 public:
  TransformsStyleInterpolator(
      const TransformsInterpolatorFactories &factories,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath);

  jsi::Value getCurrentValue(jsi::Runtime &rt) const override;
  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;

  jsi::Value update(const InterpolationUpdateContext context) override;

  void updateKeyframes(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) override;

 private:
  const TransformsInterpolatorFactories &factories_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
};

} // namespace reanimated

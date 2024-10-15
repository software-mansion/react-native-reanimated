#pragma once

#include <reanimated/CSS/util/interpolators.h>

namespace reanimated {

class ObjectPropertiesInterpolator : public PropertyInterpolator {
 public:
  ObjectPropertiesInterpolator(
      const PropertiesInterpolatorFactories &factories,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath);

  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;

  jsi::Value update(const InterpolationUpdateContext &context) override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) override;

 private:
  const PropertiesInterpolatorFactories &factories_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  PropertiesInterpolators interpolators_;

  jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      std::function<jsi::Value(PropertyInterpolator &)> callback) const;
};

} // namespace reanimated

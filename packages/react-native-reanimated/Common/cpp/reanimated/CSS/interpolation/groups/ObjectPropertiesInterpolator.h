#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/util/interpolators.h>

#include <memory>
#include <string>

namespace reanimated {

class ObjectPropertiesInterpolator : public PropertyInterpolator {
 public:
  ObjectPropertiesInterpolator(
      const PropertyInterpolatorFactories &factories,
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~ObjectPropertiesInterpolator() = default;

  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;
  jsi::Value getCurrentValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;
  jsi::Value getFirstKeyframeValue(jsi::Runtime &rt) const override;
  jsi::Value getLastKeyframeValue(jsi::Runtime &rt) const override;

  bool equalsReversingAdjustedStartValue(
      jsi::Runtime &rt,
      const jsi::Value &propertyValue) const override;

  jsi::Value update(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override;
  jsi::Value reset(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) override;

 private:
  const PropertyInterpolatorFactories &factories_;

  PropertiesInterpolators interpolators_;

  jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      const std::function<jsi::Value(PropertyInterpolator &)> &callback) const;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

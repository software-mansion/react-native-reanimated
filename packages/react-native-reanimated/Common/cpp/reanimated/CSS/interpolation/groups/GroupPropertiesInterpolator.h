#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>

#include <memory>

namespace reanimated {

class GroupPropertiesInterpolator : public PropertyInterpolator {
 public:
  GroupPropertiesInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;
  jsi::Value getCurrentValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;
  jsi::Value getFirstKeyframeValue(jsi::Runtime &rt) const override;
  jsi::Value getLastKeyframeValue(jsi::Runtime &rt) const override;

  jsi::Value update(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override;
  jsi::Value reset(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override;

 protected:
  virtual jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      const std::function<jsi::Value(PropertyInterpolator &)> &callback)
      const = 0;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

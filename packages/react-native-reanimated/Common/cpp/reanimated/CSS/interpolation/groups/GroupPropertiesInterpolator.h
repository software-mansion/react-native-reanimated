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

  void setProgressProvider(const std::shared_ptr<KeyframeProgressProvider>
                               &progressProvider) override;

  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;
  folly::dynamic getStyleValue(
      const ShadowNode::Shared &shadowNode) const override;
  jsi::Value getCurrentValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;
  folly::dynamic getCurrentValue(
      const ShadowNode::Shared &shadowNode) const override;
  folly::dynamic getFirstKeyframeValue() const override;
  folly::dynamic getLastKeyframeValue() const override;

  folly::dynamic update(const ShadowNode::Shared &shadowNode)
      override;
  jsi::Value reset(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override;
  folly::dynamic reset(const ShadowNode::Shared &shadowNode)
      override;

 protected:
  virtual void forEachInterpolator(
      const std::function<void(PropertyInterpolator &)> &callback) const = 0;
  virtual jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      const std::function<jsi::Value(PropertyInterpolator &)> &callback)
      const = 0;
  virtual folly::dynamic mapInterpolators(
      const std::function<folly::dynamic(PropertyInterpolator &)> &callback)
      const = 0;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

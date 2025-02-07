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

  folly::dynamic getStyleValue(
      const ShadowNode::Shared &shadowNode) const override;
  jsi::Value getFirstKeyframeValue(jsi::Runtime &rt) const override;
  jsi::Value getLastKeyframeValue(jsi::Runtime &rt) const override;

  folly::dynamic update(const ShadowNode::Shared &shadowNode) override;

 protected:
  virtual void forEachInterpolator(
      const std::function<void(PropertyInterpolator &)> &callback) const = 0;
  virtual folly::dynamic mapInterpolators(
      const std::function<folly::dynamic(PropertyInterpolator &)> &callback)
      const = 0;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

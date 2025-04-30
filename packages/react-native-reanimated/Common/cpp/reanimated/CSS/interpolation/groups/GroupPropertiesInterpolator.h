#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>

#include <memory>

namespace reanimated::css {

class GroupPropertiesInterpolator : public PropertyInterpolator {
 public:
  GroupPropertiesInterpolator(const PropertyPath &propertyPath);

  folly::dynamic getStyleValue(
      const ShadowNode::Shared &shadowNode) const override;
  folly::dynamic getResetStyle(
      const ShadowNode::Shared &shadowNode) const override;
  folly::dynamic getFirstKeyframeValue() const override;
  folly::dynamic getLastKeyframeValue() const override;

  folly::dynamic interpolate(
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider)
      const override;

 protected:
  virtual folly::dynamic mapInterpolators(
      const std::function<folly::dynamic(PropertyInterpolator &)> &callback)
      const = 0;
};

} // namespace reanimated::css

#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/values/CSSValue.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

class PropertyInterpolator {
 public:
  explicit PropertyInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  virtual folly::dynamic getStyleValue(
      const ShadowNode::Shared &shadowNode) const = 0;
  virtual folly::dynamic getResetStyle(
      const ShadowNode::Shared &shadowNode) const = 0;
  virtual folly::dynamic getFirstKeyframeValue() const = 0;
  virtual folly::dynamic getLastKeyframeValue() const = 0;
  virtual bool equalsReversingAdjustedStartValue(
      const folly::dynamic &propertyValue) const = 0;

  virtual void updateKeyframes(
      jsi::Runtime &rt,
      const jsi::Value &keyframes) = 0;
  virtual void updateKeyframesFromStyleChange(
      const folly::dynamic &oldStyleValue,
      const folly::dynamic &newStyleValue,
      const folly::dynamic &lastUpdateValue) = 0;

  virtual folly::dynamic interpolate(
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider)
      const = 0;

 protected:
  const PropertyPath propertyPath_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
};

class PropertyInterpolatorFactory {
 public:
  PropertyInterpolatorFactory() = default;
  virtual ~PropertyInterpolatorFactory() = default;

  virtual bool isDiscreteProperty() const;
  virtual const CSSValue &getDefaultValue() const = 0;

  virtual std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const = 0;
};

using PropertyInterpolatorsRecord =
    std::unordered_map<std::string, std::shared_ptr<PropertyInterpolator>>;
using InterpolatorFactoriesRecord = std::
    unordered_map<std::string, std::shared_ptr<PropertyInterpolatorFactory>>;

using PropertyInterpolatorsArray =
    std::vector<std::shared_ptr<PropertyInterpolator>>;
using InterpolatorFactoriesArray =
    std::vector<std::shared_ptr<PropertyInterpolatorFactory>>;

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

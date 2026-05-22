#pragma once

#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class AnimationStyleInterpolatorFactory {
 public:
  AnimationStyleInterpolatorFactory(
      jsi::Runtime &rt,
      const jsi::Value &keyframes,
      std::string nativeComponentName,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  std::shared_ptr<AnimationStyleInterpolator> create() const;
  std::shared_ptr<AnimationStyleInterpolator> create(const std::unordered_set<std::string> &propertyNames) const;

  const std::unordered_set<std::string> &getAllPropertyNames() const;

  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;

 private:
  const std::string nativeComponentName_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  const InterpolatorFactoriesRecord &factories_;
  std::shared_ptr<const PropertyInterpolatorsRecord> interpolatorsByProperty_;
  const std::unordered_set<std::string> allPropertyNames_;

  PropertyInterpolatorsRecord parseInterpolatorsByProperty(jsi::Runtime &rt, const jsi::Value &keyframes) const;
  static std::unordered_set<std::string> collectPropertyNames(
      const std::shared_ptr<const PropertyInterpolatorsRecord> &interpolatorsByProperty);
};

} // namespace reanimated::css

#pragma once

#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>
#include <reanimated/CSS/utils/interpolators.h>

#include <memory>

namespace reanimated::css {

class ArrayPropertiesInterpolator : public GroupPropertiesInterpolator {
 public:
  ArrayPropertiesInterpolator(
      const InterpolatorFactoriesArray &factories,
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~ArrayPropertiesInterpolator() = default;

  folly::dynamic getStyleValue(const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  bool updateKeyframes(jsi::Runtime &rt, const jsi::Value &fromValue, const jsi::Value &toValue) override;
  /** TODO: unify folly::dynamic and jsi::value versions */
  bool updateKeyframes(const folly::dynamic &fromValue, const folly::dynamic &toValue) override;

 protected:
  folly::dynamic mapInterpolators(const std::function<folly::dynamic(PropertyInterpolator &)> &callback) const override;

 private:
  const InterpolatorFactoriesArray &factories_;
  PropertyInterpolatorsArray interpolators_;

  folly::dynamic getDefaultValue() const;
  void resizeInterpolators(size_t valuesCount);
};

} // namespace reanimated::css

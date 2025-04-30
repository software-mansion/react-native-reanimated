#pragma once

#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>
#include <reanimated/CSS/util/interpolators.h>

#include <algorithm>
#include <memory>

namespace reanimated::css {

class ArrayPropertiesInterpolator : public GroupPropertiesInterpolator {
 public:
  ArrayPropertiesInterpolator(
      const InterpolatorFactoriesArray &factories,
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~ArrayPropertiesInterpolator() = default;

  bool equalsReversingAdjustedStartValue(
      const folly::dynamic &propertyValue) const override;

  void updateKeyframes(const folly::dynamic &keyframes) override;
  void updateKeyframesFromStyleChange(
      const folly::dynamic &oldStyleValue,
      const folly::dynamic &newStyleValue,
      const folly::dynamic &lastUpdateValue) override;

 protected:
  folly::dynamic mapInterpolators(
      const std::function<folly::dynamic(PropertyInterpolator &)> &callback)
      const override;

 private:
  const InterpolatorFactoriesArray &factories_;
  PropertyInterpolatorsArray interpolators_;

  void resizeInterpolators(size_t valuesCount);
};

} // namespace reanimated::css

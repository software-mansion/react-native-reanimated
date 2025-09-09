#pragma once

#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>
#include <reanimated/CSS/utils/interpolators.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class RecordPropertiesInterpolator : public GroupPropertiesInterpolator {
 public:
  RecordPropertiesInterpolator(
      const InterpolatorFactoriesRecord &factories,
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~RecordPropertiesInterpolator() = default;

  bool equalsReversingAdjustedStartValue(
      const folly::dynamic &propertyValue) const override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      const folly::dynamic &oldStyleValue,
      const folly::dynamic &newStyleValue,
      const folly::dynamic &lastUpdateValue) override;

 protected:
  folly::dynamic mapInterpolators(
      const std::function<folly::dynamic(PropertyInterpolator &)> &callback)
      const override;

  void maybeCreateInterpolator(const std::string &propertyName);

 private:
  const InterpolatorFactoriesRecord &factories_;
  PropertyInterpolatorsRecord interpolators_;
};

} // namespace reanimated::css

#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>
#include <reanimated/CSS/util/interpolators.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated {

class RecordPropertiesInterpolator : public GroupPropertiesInterpolator {
 public:
  RecordPropertiesInterpolator(
      const InterpolatorFactoriesRecord &factories,
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~RecordPropertiesInterpolator() = default;

  bool equalsReversingAdjustedStartValue(
      jsi::Runtime &rt,
      const jsi::Value &propertyValue) const override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue,
      const jsi::Value &previousValue,
      const jsi::Value &reversingAdjustedStartValue) override;

 protected:
  void forEachInterpolator(const std::function<void(PropertyInterpolator &)>
                               &callback) const override;
  folly::dynamic mapInterpolators(
      const std::function<folly::dynamic(PropertyInterpolator &)> &callback)
      const override;

  void maybeCreateInterpolator(const std::string &propertyName);

 private:
  const InterpolatorFactoriesRecord &factories_;
  PropertyInterpolatorsRecord interpolators_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

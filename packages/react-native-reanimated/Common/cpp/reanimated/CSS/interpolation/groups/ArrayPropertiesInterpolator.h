#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>
#include <reanimated/CSS/util/interpolators.h>

#include <memory>

namespace reanimated {

class ArrayPropertiesInterpolator : public GroupPropertiesInterpolator {
 public:
  ArrayPropertiesInterpolator(
      const InterpolatorFactoriesArray &factories,
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~ArrayPropertiesInterpolator() = default;

  bool equalsReversingAdjustedStartValue(
      jsi::Runtime &rt,
      const jsi::Value &propertyValue) const override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) override;

 protected:
  jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      const std::function<jsi::Value(PropertyInterpolator &)> &callback)
      const override;

 private:
  const InterpolatorFactoriesArray &factories_;
  PropertyInterpolatorsArray interpolators_;

  void resizeInterpolators(size_t valuesCount);
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/interpolation/filters/FilterOperationInterpolator.h>
#include <reanimated/CSS/utils/keyframes.h>

#include <memory>
#include <tuple>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

struct FilterKeyframe {
  const double fromOffset;
  const double toOffset;
  // If the value is nullopt, we would have to read it from the view style
  // (in all other cases, both vectors will have the same number of elements of
  // corresponding types - elements from the same index will form interpolation
  // pairs)
  const std::optional<FilterOperations> fromOperations;
  const std::optional<FilterOperations> toOperations;
  // Keyframe is discrete when the fromOperations and toOperations aren't compatible
  const bool isDiscrete;
};

class FilterStyleInterpolator final : public PropertyInterpolator {
 public:
  FilterStyleInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<FilterOperationInterpolators> &interpolators,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  folly::dynamic getStyleValue(const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getFirstKeyframeValue() const override;
  folly::dynamic getLastKeyframeValue() const override;
  bool equalsReversingAdjustedStartValue(const folly::dynamic &propertyValue) const override;

  folly::dynamic interpolate(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      // The following param can be ignored as every transformation can be
      // interpolated
      const double /* fallbackInterpolateThreshold */) const override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      const folly::dynamic &oldStyleValue,
      const folly::dynamic &newStyleValue,
      const folly::dynamic &lastUpdateValue) override;

 private:
  const std::shared_ptr<FilterOperationInterpolators> interpolators_;
  static const FilterOperations defaultStyleValue_;

  std::vector<std::shared_ptr<FilterKeyframe>> keyframes_;
  std::optional<FilterOperations> reversingAdjustedStartValue_;

  static std::optional<FilterOperations> parseFilterOperations(jsi::Runtime &rt, const jsi::Value &values);
  static std::optional<FilterOperations> parseFilterOperations(const folly::dynamic &values);
  std::shared_ptr<FilterKeyframe> createFilterKeyframe(
      double fromOffset,
      double toOffset,
      const std::optional<FilterOperations> &fromOperationsOptional,
      const std::optional<FilterOperations> &toOperationsOptional) const;
  std::tuple<FilterOperations, FilterOperations, bool> createFilterInterpolationPair(
      const FilterOperations &fromOperations,
      const FilterOperations &toOperations) const;
  std::shared_ptr<FilterOperation> getDefaultOperationOfType(FilterOp type) const;

  size_t getIndexOfCurrentKeyframe(const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const;
  FilterOperations getFallbackValue(const std::shared_ptr<const ShadowNode> &shadowNode) const;
  folly::dynamic interpolateOperations(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      double keyframeProgress,
      const FilterOperations &fromOperations,
      const FilterOperations &toOperations) const;

  static folly::dynamic convertOperationsToDynamic(const FilterOperations &operations);
  FilterInterpolationContext createUpdateContext(const std::shared_ptr<const ShadowNode> &shadowNode) const;
};

} // namespace reanimated::css

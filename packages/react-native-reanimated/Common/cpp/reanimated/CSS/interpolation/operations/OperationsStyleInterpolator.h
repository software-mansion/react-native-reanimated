#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/interpolation/operations/StyleOperation.h>
#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>

#include <memory>
#include <optional>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

struct StyleOperationsKeyframe {
  const double fromOffset;
  const double toOffset;
  // If the value is nullopt, we would have to read it from the view style
  // (in all other cases, both vectors will have the same number of elements of
  // corresponding types - elements from the same index will form interpolation
  // pairs)
  const std::optional<StyleOperations> fromOperations;
  const std::optional<StyleOperations> toOperations;
  // Keyframe is discrete when the fromOperations and toOperations aren't compatible
  const bool isDiscrete;
};

class OperationsStyleInterpolator : public PropertyInterpolator {
 public:
  OperationsStyleInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<StyleOperationInterpolators> &interpolators,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const folly::dynamic &defaultStyleValueDynamic);

  folly::dynamic getStyleValue(const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getFirstKeyframeValue() const override;
  folly::dynamic getLastKeyframeValue() const override;
  bool equalsReversingAdjustedStartValue(const folly::dynamic &propertyValue) const override;

  folly::dynamic interpolate(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const double fallbackInterpolateThreshold) const override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      const folly::dynamic &oldStyleValue,
      const folly::dynamic &newStyleValue,
      const folly::dynamic &lastUpdateValue) override;

 protected:
  const std::shared_ptr<StyleOperationInterpolators> interpolators_;

  virtual std::shared_ptr<StyleOperation> createStyleOperation(jsi::Runtime &rt, const jsi::Value &value) const = 0;
  virtual std::shared_ptr<StyleOperation> createStyleOperation(const folly::dynamic &value) const = 0;
  virtual std::optional<std::pair<StyleOperations, StyleOperations>> createInterpolationPair(
      const StyleOperations &fromOperations,
      const StyleOperations &toOperations) const = 0;

 private:
  const folly::dynamic defaultStyleValueDynamic_;

  std::vector<std::shared_ptr<StyleOperationsKeyframe>> keyframes_;
  std::optional<StyleOperations> reversingAdjustedStartValue_;

  std::optional<StyleOperations> parseStyleOperations(jsi::Runtime &rt, const jsi::Value &values) const;
  std::optional<StyleOperations> parseStyleOperations(const folly::dynamic &values) const;
  std::shared_ptr<StyleOperationsKeyframe> createStyleOperationsKeyframe(
      double fromOffset,
      double toOffset,
      const std::optional<StyleOperations> &fromOperationsOptional,
      const std::optional<StyleOperations> &toOperationsOptional) const;
  size_t getIndexOfCurrentKeyframe(const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const;
  StyleOperations getFallbackValue(const std::shared_ptr<const ShadowNode> &shadowNode) const;
  folly::dynamic interpolateOperations(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      double keyframeProgress,
      const StyleOperations &fromOperations,
      const StyleOperations &toOperations,
      double fallbackInterpolateThreshold) const;
  static folly::dynamic convertOperationsToDynamic(const StyleOperations &operations);
  StyleOperationsInterpolationContext createUpdateContext(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      double fallbackInterpolateThreshold) const;
};

template <typename TOperation>
class OperationsStyleInterpolatorBase : public OperationsStyleInterpolator {
 public:
  using OperationsStyleInterpolator::OperationsStyleInterpolator;

 protected:
  std::shared_ptr<StyleOperation> createStyleOperation(jsi::Runtime &rt, const jsi::Value &value) const override;
  std::shared_ptr<StyleOperation> createStyleOperation(const folly::dynamic &value) const override;
  std::shared_ptr<TOperation> getDefaultOperationOfType(size_t type) const;
};

} // namespace reanimated::css

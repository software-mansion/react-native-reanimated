#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/util/keyframes.h>

#include <memory>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

struct TransformKeyframe {
  const double fromOffset;
  const double toOffset;
  // If the value is nullopt, we would have to read it from the view style
  // (in all other cases, both vectors will have the same number of elements of
  // corresponding types - elements from the same index will form interpolation
  // pairs)
  const std::optional<TransformOperations> fromOperations;
  const std::optional<TransformOperations> toOperations;
};

class TransformsStyleInterpolator final : public PropertyInterpolator {
 public:
  TransformsStyleInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<TransformInterpolators> &interpolators);

  folly::dynamic getStyleValue(
      const ShadowNode::Shared &shadowNode) const override;
  folly::dynamic getResetStyle(
      const ShadowNode::Shared &shadowNode) const override;
  folly::dynamic getFirstKeyframeValue() const override;
  folly::dynamic getLastKeyframeValue() const override;
  bool equalsReversingAdjustedStartValue(
      const folly::dynamic &propertyValue) const override;

  folly::dynamic interpolate(
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider)
      const override;

  void updateKeyframes(const folly::dynamic &keyframes) override;
  void updateKeyframesFromStyleChange(
      const folly::dynamic &oldStyleValue,
      const folly::dynamic &newStyleValue,
      const folly::dynamic &lastUpdateValue) override;

 private:
  const std::shared_ptr<TransformInterpolators> interpolators_;
  static const TransformOperations defaultStyleValue_;

  std::vector<std::shared_ptr<TransformKeyframe>> keyframes_;
  std::optional<TransformOperations> reversingAdjustedStartValue_;

  static std::optional<TransformOperations> parseTransformOperations(
      jsi::Runtime &rt,
      const jsi::Value &values);
  static std::optional<TransformOperations> parseTransformOperations(
      const folly::dynamic &values);
  std::shared_ptr<TransformKeyframe> createTransformKeyframe(
      double fromOffset,
      double toOffset,
      const std::optional<TransformOperations> &fromOperationsOptional,
      const std::optional<TransformOperations> &toOperationsOptional) const;
  std::pair<TransformOperations, TransformOperations>
  createTransformInterpolationPair(
      const TransformOperations &fromOperations,
      const TransformOperations &toOperations) const;
  void addConvertedOperations(
      const std::shared_ptr<TransformOperation> &sourceOperation,
      const std::shared_ptr<TransformOperation> &targetOperation,
      TransformOperations &sourceResult,
      TransformOperations &targetResult) const;
  std::shared_ptr<TransformOperation> getDefaultOperationOfType(
      TransformOperationType type) const;

  size_t getIndexOfCurrentKeyframe(
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const;
  TransformOperations getFallbackValue(
      const ShadowNode::Shared &shadowNode) const;
  TransformOperations interpolateOperations(
      const ShadowNode::Shared &shadowNode,
      double keyframeProgress,
      const TransformOperations &fromOperations,
      const TransformOperations &toOperations) const;

  static folly::dynamic convertResultToDynamic(
      const TransformOperations &operations);
  TransformInterpolatorUpdateContext createUpdateContext(
      const ShadowNode::Shared &shadowNode) const;
};

} // namespace reanimated::css

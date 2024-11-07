#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/util/keyframes.h>

#include <memory>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

struct TransformKeyframe {
  const double fromOffset;
  const double toOffset;
  // If the value is nullopt, we would have to read it from the view style
  // (in all other cases, both vectors will have the same number of elements of
  // corresponding types  - elements from the same index will form interpolation
  // pairs)
  const std::optional<TransformOperations> fromOperations;
  const std::optional<TransformOperations> toOperations;
};

class TransformsStyleInterpolator final : public PropertyInterpolator {
 public:
  TransformsStyleInterpolator(
      const std::shared_ptr<TransformInterpolators> &interpolators,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath);

  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;
  jsi::Value getCurrentValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;

  jsi::Value update(const PropertyInterpolationUpdateContext &context) override;
  jsi::Value reset(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) override;

 private:
  const std::shared_ptr<TransformInterpolators> interpolators_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  size_t keyframeIndex_ = 0;
  std::vector<std::shared_ptr<TransformKeyframe>> keyframes_;
  std::shared_ptr<TransformKeyframe> currentKeyframe_;
  std::optional<TransformOperations> previousResult_;

  static std::optional<TransformOperations> parseTransformOperations(
      jsi::Runtime &rt,
      const jsi::Value &values);
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

  TransformOperations getFallbackValue(
      const PropertyInterpolationUpdateContext &context) const;
  TransformOperations resolveTransformOperations(
      const TransformOperations &unresolvedOperations,
      const PropertyInterpolationUpdateContext &context) const;
  std::shared_ptr<TransformKeyframe> getKeyframeAtIndex(
      size_t index,
      int resolveDirection, // < 0 - resolve from, > 0 - resolve to
      const PropertyInterpolationUpdateContext &context) const;
  void updateCurrentKeyframe(const PropertyInterpolationUpdateContext &context);
  inline double calculateLocalProgress(double progress) const;
  TransformOperations interpolateOperations(
      double localProgress,
      const TransformOperations &fromOperations,
      const TransformOperations &toOperations,
      const PropertyInterpolationUpdateContext &context) const;

  static jsi::Value convertResultToJSI(
      jsi::Runtime &rt,
      const TransformOperations &operations);
  TransformInterpolatorUpdateContext createUpdateContext(
      const PropertyInterpolationUpdateContext &context) const;
};

} // namespace reanimated

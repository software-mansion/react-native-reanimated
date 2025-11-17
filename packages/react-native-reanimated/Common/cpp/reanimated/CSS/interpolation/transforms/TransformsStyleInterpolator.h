#pragma once

#include <reanimated/CSS/interpolation/operations/OperationsStyleInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>

namespace reanimated::css {

class TransformsStyleInterpolator final : public OperationsStyleInterpolatorBase<TransformOperation> {
 public:
  TransformsStyleInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<StyleOperationInterpolators> &interpolators,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

 protected:
  std::optional<std::pair<TransformOperations, TransformOperations>> createInterpolationPair(
      const TransformOperations &fromOperations,
      const TransformOperations &toOperations) const override;

 private:
  void addConvertedOperations(
      const std::shared_ptr<TransformOperation> &sourceOperation,
      const std::shared_ptr<TransformOperation> &targetOperation,
      TransformOperations &sourceResult,
      TransformOperations &targetResult) const;
  std::shared_ptr<TransformOperation> getDefaultOperationOfType(TransformOp type) const;
};

} // namespace reanimated::css

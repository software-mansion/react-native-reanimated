#pragma once

#include <reanimated/CSS/interpolation/operations/OperationsStyleInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>

#include <memory>
#include <utility>

namespace reanimated::css {

class TransformsStyleInterpolator final : public OperationsStyleInterpolatorBase<TransformOperation> {
 public:
  TransformsStyleInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<StyleOperationInterpolators> &interpolators,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

 protected:
  std::optional<std::pair<StyleOperations, StyleOperations>> createInterpolationPair(
      const StyleOperations &fromOperations,
      const StyleOperations &toOperations) const override;

 private:
  void addConvertedOperations(
      const std::shared_ptr<TransformOperation> &sourceOperation,
      const std::shared_ptr<TransformOperation> &targetOperation,
      StyleOperations &sourceResult,
      StyleOperations &targetResult) const;
  TransformOperations convertToTransformOperations(const StyleOperations &operations) const;
  std::shared_ptr<TransformOperation> getDefaultOperationOfType(uint8_t type) const;
};

} // namespace reanimated::css

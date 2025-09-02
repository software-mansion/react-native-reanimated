#pragma once

#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>
#include <numeric>
#include <vector>

namespace reanimated::css {

/**
 * Convert 2D operations to a matrix
 * @param operations The array of 2D transform operations that can be
 * converted to matrix (that don't have relative values)
 */
TransformMatrix2D operationsToMatrix2D(const TransformOperations &operations);

/**
 * Convert 3D operations to a matrix
 * @param operations The array of 3D transform operations that can be
 * converted to matrix (that don't have relative values)
 */
TransformMatrix3D operationsToMatrix3D(const TransformOperations &operations);

// Matrix
struct MatrixOperation final
    : public TransformOperationBase<
          TransformOp::Matrix,
          std::variant<std::unique_ptr<TransformMatrix>, TransformOperations>> {
  using TransformOperationBase<
      TransformOp::Matrix,
      std::variant<std::unique_ptr<TransformMatrix>, TransformOperations>>::
      TransformOperationBase;

  explicit MatrixOperation(TransformMatrix2D matrix);
  explicit MatrixOperation(TransformMatrix3D matrix);
  explicit MatrixOperation(TransformOperations operations);

  bool operator==(const TransformOperation &other) const override;

  folly::dynamic valueToDynamic() const override;
  bool is3D() const override;
  std::unique_ptr<TransformMatrix> toMatrix(bool force3D) const override;
  std::unique_ptr<TransformMatrix> toMatrix(
      bool force3D,
      const TransformUpdateContext &context) const override;

 private:
  bool is3D_;

  std::unique_ptr<TransformMatrix> matrixFromVariant(bool force3D) const;
};

} // namespace reanimated::css

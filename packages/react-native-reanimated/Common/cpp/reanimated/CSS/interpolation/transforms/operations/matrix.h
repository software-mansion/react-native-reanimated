#pragma once

#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <utility>
#include <variant>

namespace reanimated::css {

// MatrixOperationValue type for matrix operations
using MatrixOperationValue = std::variant<TransformMatrix::Shared, TransformOperations>;

/**
 * Multiplies all operations in the vector to a single 3D matrix
 * @param operations - the vector of operations that can be represented in 3D
 */
TransformMatrix3D matrixFromOperations3D(TransformOperations &operations);

/**
 * Multiplies all operations in the vector to a single 2D matrix
 * @param operations - the vector of operations that can be represented in 2D
 */
TransformMatrix2D matrixFromOperations2D(TransformOperations &operations);

/**
 * MatrixOperation does not inherit from TransformOperationBase because its value type
 * is different from the other transform operations which use a CSSValue-derived type.
 * Instead, it uses a variant of TransformMatrix::Shared and TransformOperations that
 * doesn't have a value field.
 */
struct MatrixOperation final : public TransformOperation {
  const MatrixOperationValue value;

  explicit MatrixOperation(MatrixOperationValue value);
  explicit MatrixOperation(jsi::Runtime &rt, const jsi::Value &value);
  explicit MatrixOperation(const folly::dynamic &value);
  explicit MatrixOperation(TransformMatrix2D matrix);
  explicit MatrixOperation(TransformMatrix3D matrix);
  explicit MatrixOperation(TransformOperations operations);

  bool is3D() const override;
  folly::dynamic valueToDynamic() const override;
  TransformMatrix::Shared toMatrix(bool force3D) const override;

 protected:
  bool areValuesEqual(const StyleOperation &other) const override;

 private:
  bool is3D_;

  const TransformMatrix::Shared &getMatrixFromVariant() const;
};

} // namespace reanimated::css

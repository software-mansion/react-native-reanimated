#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

namespace reanimated::css {

// Matrix
struct MatrixOperation final
    : public TransformOperationBase<
          std::variant<TransformMatrix3D, TransformOperations>> {
  using TransformOperationBase<
      std::variant<TransformMatrix3D, TransformOperations>>::
      TransformOperationBase;

  explicit MatrixOperation(const TransformMatrix3D &value);
  explicit MatrixOperation(const TransformOperations &operations);

  bool operator==(const TransformOperation &other) const override;

  TransformOperationType type() const override;
  folly::dynamic valueToDynamic() const override;
  TransformMatrix3D toMatrix() const override;
};

} // namespace reanimated::css

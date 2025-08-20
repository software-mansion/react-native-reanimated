#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>
#include <vector>

namespace reanimated::css {

// Matrix
struct MatrixOperation final
    : public TransformOperationBase<
          TransformOp::Matrix,
          std::variant<TransformMatrix3D, TransformOperations>> {
  using TransformOperationBase<
      TransformOp::Matrix,
      std::variant<TransformMatrix3D, TransformOperations>>::
      TransformOperationBase;

  explicit MatrixOperation(const TransformMatrix3D &value);
  explicit MatrixOperation(const TransformOperations &operations);

  bool operator==(const TransformOperation &other) const override;

  folly::dynamic valueToDynamic() const override;
  TransformMatrix3D toMatrix() const override;
};

} // namespace reanimated::css

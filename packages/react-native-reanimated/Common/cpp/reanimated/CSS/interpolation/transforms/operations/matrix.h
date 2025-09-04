#pragma once

#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <algorithm>
#include <deque>
#include <memory>
#include <numeric>
#include <utility>
#include <vector>

namespace reanimated::css {

using MatrixOperationValue =
    std::variant<TransformMatrix::Shared, TransformOperations>;

struct MatrixOperation final
    : public TransformOperationBase<TransformOp::Matrix, MatrixOperationValue> {
  using TransformOperationBase<TransformOp::Matrix, MatrixOperationValue>::
      TransformOperationBase;

  explicit MatrixOperation(jsi::Runtime &rt, const jsi::Value &value);
  explicit MatrixOperation(const folly::dynamic &value);
  explicit MatrixOperation(TransformMatrix2D matrix);
  explicit MatrixOperation(TransformMatrix3D matrix);
  explicit MatrixOperation(TransformOperations operations);

  bool operator==(const TransformOperation &other) const override;

  folly::dynamic valueToDynamic() const override;
  bool is3D() const noexcept override {
    return is3D_;
  }
  TransformMatrix::Shared toMatrix(bool force3D) const override;
  TransformMatrix::Shared matrixFromVariant(bool force3D) const;

 private:
  bool is3D_;
};

} // namespace reanimated::css

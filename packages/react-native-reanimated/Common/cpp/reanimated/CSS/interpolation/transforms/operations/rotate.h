#pragma once

#include <reanimated/CSS/common/transforms/TransformMatrix.h>
#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
struct RotateOperationBase2D : public TransformOperationBase<TOperation, CSSAngle> {
  using TransformOperationBase<TOperation, CSSAngle>::TransformOperationBase;

  explicit RotateOperationBase2D(const std::string &value);
};

template <TransformOp TOperation>
struct RotateOperationBase3D : public TransformOperationBase<TOperation, CSSAngle> {
  using TransformOperationBase<TOperation, CSSAngle>::TransformOperationBase;

  explicit RotateOperationBase3D(const std::string &value);

  bool is3D() const override;
  TransformMatrix::Shared toMatrix(bool /* force3D */) const override;
};

using RotateOperation = RotateOperationBase2D<TransformOp::Rotate>;
using RotateXOperation = RotateOperationBase3D<TransformOp::RotateX>;
using RotateYOperation = RotateOperationBase3D<TransformOp::RotateY>;

struct RotateZOperation final : public RotateOperationBase2D<TransformOp::RotateZ> {
  using RotateOperationBase2D<TransformOp::RotateZ>::RotateOperationBase2D;

  bool canConvertTo(TransformOp type) const override;
  TransformOperations convertTo(TransformOp type) const override;
};

} // namespace reanimated::css

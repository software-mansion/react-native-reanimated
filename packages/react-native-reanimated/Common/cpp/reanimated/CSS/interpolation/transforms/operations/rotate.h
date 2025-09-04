#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>
#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
struct RotateOperationBase
    : public TransformOperationBase<TOperation, CSSAngle> {
  using TransformOperationBase<TOperation, CSSAngle>::TransformOperationBase;

  explicit RotateOperationBase(const std::string &value)
      : TransformOperationBase<TOperation, CSSAngle>(CSSAngle(value)) {}

  folly::dynamic valueToDynamic() const override {
    return this->value.toDynamic();
  }

  TransformMatrix3D toMatrix() const override {
    return TransformMatrix3D::create<TOperation>(this->value.value);
  }
};

using RotateOperation = RotateOperationBase<TransformOp::Rotate>;

using RotateXOperation = RotateOperationBase<TransformOp::RotateX>;

using RotateYOperation = RotateOperationBase<TransformOp::RotateY>;

struct RotateZOperation final
    : public RotateOperationBase<TransformOp::RotateZ> {
  using RotateOperationBase<TransformOp::RotateZ>::RotateOperationBase;

  bool canConvertTo(TransformOp type) const override {
    return type == TransformOp::Rotate;
  }

  TransformOperations convertTo(TransformOp type) const override {
    assertCanConvertTo(type);
    return {std::make_shared<RotateOperation>(value)};
  }
};

} // namespace reanimated::css

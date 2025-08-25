#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>

namespace reanimated::css {

template <TransformOp TOperation>
struct ScaleOperationBase
    : public TransformOperationBase<TOperation, CSSDouble> {
  using TransformOperationBase<TOperation, CSSDouble>::TransformOperationBase;

  explicit ScaleOperationBase(const double value)
      : TransformOperationBase<TOperation, CSSDouble>(CSSDouble(value)) {}

  folly::dynamic valueToDynamic() const override {
    return this->value.toDynamic();
  }

  TransformMatrix3D toMatrix() const override {
    return TransformMatrix3D::create<TOperation>(this->value.value);
  }
};

using ScaleXOperation = ScaleOperationBase<TransformOp::ScaleX>;

using ScaleYOperation = ScaleOperationBase<TransformOp::ScaleY>;

struct ScaleOperation final : public ScaleOperationBase<TransformOp::Scale> {
  using ScaleOperationBase<TransformOp::Scale>::ScaleOperationBase;

  bool canConvertTo(TransformOp type) const override {
    return type == TransformOp::ScaleX || type == TransformOp::ScaleY;
  }

  TransformOperations convertTo(TransformOp type) const override {
    assertCanConvertTo(type);
    if (type == TransformOp::ScaleX) {
      return {
          std::make_shared<ScaleXOperation>(value),
          std::make_shared<ScaleYOperation>(value)};
    } else {
      return {
          std::make_shared<ScaleYOperation>(value),
          std::make_shared<ScaleXOperation>(value)};
    }
  }
};

} // namespace reanimated::css

#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
struct TranslateOperationBase
    : public TransformOperationBase<TOperation, CSSLength> {
  using TransformOperationBase<TOperation, CSSLength>::TransformOperationBase;

  explicit TranslateOperationBase(double value)
      : TransformOperationBase<TOperation, CSSLength>(CSSLength(value)) {}
  explicit TranslateOperationBase(const std::string &value)
      : TransformOperationBase<TOperation, CSSLength>(CSSLength(value)) {}

  bool isRelative() const override {
    return this->value.isRelative;
  }

  folly::dynamic valueToDynamic() const override {
    return this->value.toDynamic();
  }

  TransformMatrix3D toMatrix() const override {
    if (this->value.isRelative) {
      throw std::invalid_argument(
          "[Reanimated] Cannot convert relative translate to the matrix.");
    }
    return TransformMatrix3D::create<TOperation>(this->value.value);
  }
};

using TranslateXOperation = TranslateOperationBase<TransformOp::TranslateX>;

using TranslateYOperation = TranslateOperationBase<TransformOp::TranslateY>;

} // namespace reanimated::css

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

  bool shouldResolve() const override {
    return this->value.isRelative;
  }

  folly::dynamic valueToDynamic() const override {
    return this->value.toDynamic();
  }

  TransformMatrix::Shared toMatrix(bool force3D) const override {
    if (shouldResolve()) {
      throw std::invalid_argument(
          "[Reanimated] Cannot convert unresolved relative translate value to matrix: " +
          this->value.toString());
    }

    if (force3D) {
      return std::make_shared<TransformMatrix3D>(
          TransformMatrix3D::create<TOperation>(this->value.value));
    }
    return std::make_shared<TransformMatrix2D>(
        TransformMatrix2D::create<TOperation>(this->value.value));
  }
};

using TranslateXOperation = TranslateOperationBase<TransformOp::TranslateX>;

using TranslateYOperation = TranslateOperationBase<TransformOp::TranslateY>;

} // namespace reanimated::css

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

  std::unique_ptr<TransformMatrix> toMatrix(bool force3D) const override {
    if (this->value.isRelative) {
      throw std::invalid_argument(
          "[Reanimated] Cannot convert relative translate to the matrix.");
    }
    return TransformOperationBase<TOperation, CSSLength>::toMatrix(force3D);
  }

  std::unique_ptr<TransformMatrix> toMatrix(
      bool force3D,
      const ResolvableValueInterpolationContext &context) const override {
    const auto resolvedValue = this->value.resolve(context);

    if (!resolvedValue.has_value()) {
      throw std::invalid_argument(
          "[Reanimated] Cannot resolve relative translate value: " +
          this->value.toString());
    }

    if (force3D) {
      return std::make_unique<TransformMatrix3D>(
          TransformMatrix3D::create<TOperation>(resolvedValue.value()));
    }
    return std::make_unique<TransformMatrix2D>(
        TransformMatrix2D::create<TOperation>(resolvedValue.value()));
  }
};

using TranslateXOperation = TranslateOperationBase<TransformOp::TranslateX>;

using TranslateYOperation = TranslateOperationBase<TransformOp::TranslateY>;

} // namespace reanimated::css

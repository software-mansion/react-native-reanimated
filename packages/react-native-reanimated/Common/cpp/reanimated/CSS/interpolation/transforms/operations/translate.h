#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

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
};

struct TranslateXOperation final
    : public TranslateOperationBase<TransformOp::TranslateX> {
  using TranslateOperationBase<TransformOp::TranslateX>::TranslateOperationBase;

  TransformMatrix3D toMatrix() const override;
};

struct TranslateYOperation final
    : public TranslateOperationBase<TransformOp::TranslateY> {
  using TranslateOperationBase<TransformOp::TranslateY>::TranslateOperationBase;

  TransformMatrix3D toMatrix() const override;
};

} // namespace reanimated::css

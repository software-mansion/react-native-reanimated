#pragma once

#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

#include <string>

namespace reanimated::css {

// Translate
struct TranslateOperation : public TransformOperationBase<CSSLength> {
  using TransformOperationBase<CSSLength>::TransformOperationBase;

  explicit TranslateOperation(double value);
  explicit TranslateOperation(const std::string &value);

  bool isRelative() const override;
  folly::dynamic valueToDynamic() const override;
  virtual TransformMatrix3D toMatrix(double resolvedValue) const = 0;
  TransformMatrix3D toMatrix() const override;
};

struct TranslateXOperation final : public TranslateOperation {
  using TranslateOperation::TranslateOperation;

  TransformOperationType type() const override;
  TransformMatrix3D toMatrix(double resolvedValue) const override;
};

struct TranslateYOperation final : public TranslateOperation {
  using TranslateOperation::TranslateOperation;

  TransformOperationType type() const override;
  TransformMatrix3D toMatrix(double resolvedValue) const override;
};

} // namespace reanimated::css

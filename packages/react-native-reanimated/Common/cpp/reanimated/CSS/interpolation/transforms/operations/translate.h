#pragma once

#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>
#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
struct TranslateOperationBase : public TransformOperationBase<TOperation, CSSLength> {
  using TransformOperationBase<TOperation, CSSLength>::TransformOperationBase;

  explicit TranslateOperationBase(double value);
  explicit TranslateOperationBase(const std::string &value);

  bool shouldResolve() const override;
  TransformMatrix::Shared toMatrix(bool force3D) const override;
};

using TranslateXOperation = TranslateOperationBase<TransformOp::TranslateX>;
using TranslateYOperation = TranslateOperationBase<TransformOp::TranslateY>;

} // namespace reanimated::css

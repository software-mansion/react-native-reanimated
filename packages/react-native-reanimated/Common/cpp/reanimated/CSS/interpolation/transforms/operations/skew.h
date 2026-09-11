#pragma once

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <optional>
#include <string>

namespace reanimated::css {

template <TransformOp TOperation>
struct SkewOperationBase : public TransformOperationBase<TOperation, CSSAngle> {
  using TransformOperationBase<TOperation, CSSAngle>::TransformOperationBase;

  explicit SkewOperationBase(const std::string &value);
};

using SkewXOperation = SkewOperationBase<TransformOp::SkewX>;
using SkewYOperation = SkewOperationBase<TransformOp::SkewY>;

struct SkewAngles {
  CSSAngle x;
  CSSAngle y;

  SkewAngles interpolate(double progress, const SkewAngles &to) const;
  bool operator==(const SkewAngles &other) const = default;
};

struct SkewOperation : public TransformOperation {
  const SkewAngles value;

  explicit SkewOperation(SkewAngles angles);
  explicit SkewOperation(const folly::dynamic &angles);
  SkewOperation(jsi::Runtime &rt, const jsi::Value &angles);
  TransformMatrix::Shared toMatrix(bool force3D = false) const override;

 protected:
  folly::dynamic valueToDynamic() const override;
  bool areValuesEqual(const StyleOperation &other) const override;
};

// Convert internal combined skews to RN operations at the rendering boundary.
// The stored style must retain the original angles for interrupted transitions.
std::optional<folly::dynamic> lowerSkewTransforms(const folly::dynamic &transforms);
folly::dynamic lowerSkewProps(const folly::dynamic &props);

} // namespace reanimated::css

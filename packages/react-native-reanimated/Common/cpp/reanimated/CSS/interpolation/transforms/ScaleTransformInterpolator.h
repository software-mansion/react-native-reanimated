#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
class ScaleTransformInterpolatorBase
    : public TransformInterpolatorBase<OperationType> {
 public:
  explicit ScaleTransformInterpolatorBase(double defaultValue);
  virtual ~ScaleTransformInterpolatorBase() = default;

 protected:
  OperationType interpolate(
      double progress,
      const OperationType &fromOperation,
      const OperationType &toOperation,
      const TransformInterpolatorUpdateContext &context) const override;
};

class ScaleTransformInterpolator final
    : public ScaleTransformInterpolatorBase<ScaleOperation> {
 public:
  explicit ScaleTransformInterpolator(double defaultValue)
      : ScaleTransformInterpolatorBase(defaultValue) {}
};

class ScaleXTransformInterpolator final
    : public ScaleTransformInterpolatorBase<ScaleXOperation> {
 public:
  explicit ScaleXTransformInterpolator(double defaultValue)
      : ScaleTransformInterpolatorBase(defaultValue) {}
};

class ScaleYTransformInterpolator final
    : public ScaleTransformInterpolatorBase<ScaleYOperation> {
 public:
  explicit ScaleYTransformInterpolator(double defaultValue)
      : ScaleTransformInterpolatorBase(defaultValue) {}
};

} // namespace reanimated

#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
class RotateTransformInterpolatorBase
    : public TransformInterpolatorBase<OperationType> {
 public:
  explicit RotateTransformInterpolatorBase(const AngleValue &defaultValue);

 protected:
  OperationType interpolate(
      double progress,
      const OperationType &fromOperation,
      const OperationType &toOperation,
      const TransformInterpolatorUpdateContext &context) const override;
};

class RotateTransformInterpolator final
    : public RotateTransformInterpolatorBase<RotateOperation> {
 public:
  explicit RotateTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

class RotateXTransformInterpolator final
    : public RotateTransformInterpolatorBase<RotateXOperation> {
 public:
  explicit RotateXTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

class RotateYTransformInterpolator final
    : public RotateTransformInterpolatorBase<RotateYOperation> {
 public:
  explicit RotateYTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

class RotateZTransformInterpolator final
    : public RotateTransformInterpolatorBase<RotateZOperation> {
 public:
  explicit RotateZTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

} // namespace reanimated

#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
class RotateTransformInterpolatorBase
    : public TransformInterpolatorBase<OperationType> {
 public:
  RotateTransformInterpolatorBase(const AngleValue &defaultValue);

 protected:
  OperationType interpolate(
      const double progress,
      const OperationType &fromOperation,
      const OperationType &toOperation,
      const InterpolationUpdateContext &context) const override;
};

class RotateTransformInterpolator
    : public RotateTransformInterpolatorBase<RotateOperation> {
 public:
  RotateTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

class RotateXTransformInterpolator
    : public RotateTransformInterpolatorBase<RotateXOperation> {
 public:
  RotateXTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

class RotateYTransformInterpolator
    : public RotateTransformInterpolatorBase<RotateYOperation> {
 public:
  RotateYTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

class RotateZTransformInterpolator
    : public RotateTransformInterpolatorBase<RotateZOperation> {
 public:
  RotateZTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

} // namespace reanimated

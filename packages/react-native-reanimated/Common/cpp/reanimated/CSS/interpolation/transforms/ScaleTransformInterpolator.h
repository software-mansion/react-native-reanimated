#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
class ScaleTransformInterpolatorBase
    : public TransformInterpolatorBase<OperationType> {
 public:
  ScaleTransformInterpolatorBase(const double &defaultValue);

 protected:
  OperationType interpolate(
      const double progress,
      const OperationType &fromOperation,
      const OperationType &toOperation,
      const InterpolationUpdateContext &context) const override;
};

class ScaleTransformInterpolator
    : public ScaleTransformInterpolatorBase<ScaleOperation> {
 public:
  ScaleTransformInterpolator(const double &defaultValue)
      : ScaleTransformInterpolatorBase(defaultValue) {}
};

class ScaleXTransformInterpolator
    : public ScaleTransformInterpolatorBase<ScaleXOperation> {
 public:
  ScaleXTransformInterpolator(const double &defaultValue)
      : ScaleTransformInterpolatorBase(defaultValue) {}
};

class ScaleYTransformInterpolator
    : public ScaleTransformInterpolatorBase<ScaleYOperation> {
 public:
  ScaleYTransformInterpolator(const double &defaultValue)
      : ScaleTransformInterpolatorBase(defaultValue) {}
};

} // namespace reanimated

#pragma once

#include <reanimated/CSS/interpolation/transforms/RotateTransformInterpolator.h>

namespace reanimated {

class SkewXTransformInterpolator final
    : public RotateTransformInterpolatorBase<SkewXOperation> {
 public:
  explicit SkewXTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

class SkewYTransformInterpolator final
    : public RotateTransformInterpolatorBase<SkewYOperation> {
 public:
  explicit SkewYTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

} // namespace reanimated

#pragma once

#include <reanimated/CSS/interpolation/transforms/RotateTransformInterpolator.h>

namespace reanimated {

class SkewXTransformInterpolator
    : public RotateTransformInterpolatorBase<SkewXOperation> {
 public:
  SkewXTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

class SkewYTransformInterpolator
    : public RotateTransformInterpolatorBase<SkewYOperation> {
 public:
  SkewYTransformInterpolator(const AngleValue &defaultValue)
      : RotateTransformInterpolatorBase(defaultValue) {}
};

} // namespace reanimated

#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class PerspectiveTransformInterpolator
    : public TransformInterpolatorBase<PerspectiveOperation> {
 public:
  PerspectiveTransformInterpolator(const double &defaultValue);

 protected:
  PerspectiveOperation interpolate(
      const double progress,
      const PerspectiveOperation &fromOperation,
      const PerspectiveOperation &toOperation,
      const TransformInterpolatorUpdateContext &context) const override;
};

} // namespace reanimated

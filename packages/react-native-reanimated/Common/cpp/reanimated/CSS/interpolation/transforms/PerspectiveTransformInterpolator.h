#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

#include <memory>

namespace reanimated {

class PerspectiveTransformInterpolator final
    : public TransformInterpolatorBase<PerspectiveOperation> {
 public:
  explicit PerspectiveTransformInterpolator(double defaultValue);

 protected:
  PerspectiveOperation interpolate(
      double progress,
      const PerspectiveOperation &fromOperation,
      const PerspectiveOperation &toOperation,
      const TransformInterpolatorUpdateContext &context) const override;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

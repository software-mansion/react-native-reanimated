#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class RotateTransformInterpolator : public TransformInterpolator {
 public:
  RotateTransformInterpolator(
      const AngleValue &defaultValue,
      const PropertyPath &propertyPath);

 private:
  const AngleValue defaultValue_;
};

} // namespace reanimated

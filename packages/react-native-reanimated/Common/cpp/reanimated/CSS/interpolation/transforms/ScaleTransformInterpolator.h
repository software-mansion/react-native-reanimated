#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class ScaleTransformInterpolator : public TransformInterpolator {
 public:
  ScaleTransformInterpolator(
      const double &defaultValue,
      const PropertyPath &propertyPath);

 private:
  const double defaultValue_;
};

} // namespace reanimated

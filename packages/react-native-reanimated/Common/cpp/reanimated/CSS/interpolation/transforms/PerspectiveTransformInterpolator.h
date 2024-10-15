#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class PerspectiveTransformInterpolator : public TransformInterpolator {
 public:
  PerspectiveTransformInterpolator(
      const double &defaultValue,
      const PropertyPath &propertyPath);

 private:
  const double defaultValue_;
};

} // namespace reanimated

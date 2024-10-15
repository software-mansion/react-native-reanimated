#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class NumericTransformInterpolator : public TransformInterpolator {
 public:
  NumericTransformInterpolator(
      const double &defaultValue,
      const PropertyPath &propertyPath);

 private:
  const double defaultValue_;
};

} // namespace reanimated

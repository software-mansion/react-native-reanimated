#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class SkewTransformInterpolator : public TransformInterpolator {
 public:
  SkewTransformInterpolator(
      const AngleValue &defaultValue,
      const PropertyPath &propertyPath);

 private:
  const AngleValue defaultValue_;
};

} // namespace reanimated

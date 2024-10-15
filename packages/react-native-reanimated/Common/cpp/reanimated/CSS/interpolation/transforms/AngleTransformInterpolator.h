#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class AngleTransformInterpolator : public TransformInterpolator {
 public:
  AngleTransformInterpolator(
      const AngleValue &defaultValue,
      const PropertyPath &propertyPath);

 private:
  const AngleValue defaultValue_;
};

} // namespace reanimated

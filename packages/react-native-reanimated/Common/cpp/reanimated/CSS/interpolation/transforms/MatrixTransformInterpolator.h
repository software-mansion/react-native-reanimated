#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformMatrix.h>

namespace reanimated {

class MatrixTransformInterpolator : public TransformInterpolator {
 public:
  MatrixTransformInterpolator(
      const TransformMatrix &defaultValue,
      const PropertyPath &propertyPath);

 private:
  const TransformMatrix defaultValue_;
};

} // namespace reanimated

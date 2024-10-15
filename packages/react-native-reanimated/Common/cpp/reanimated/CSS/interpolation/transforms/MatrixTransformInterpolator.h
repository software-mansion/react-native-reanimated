#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>
#include <reanimated/CSS/structures/TransformMatrix.h>

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

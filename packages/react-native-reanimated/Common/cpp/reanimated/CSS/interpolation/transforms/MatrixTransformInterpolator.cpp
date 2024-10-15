#include <reanimated/CSS/interpolation/transforms/MatrixTransformInterpolator.h>

namespace reanimated {

MatrixTransformInterpolator::MatrixTransformInterpolator(
    const TransformMatrix &defaultValue,
    const PropertyPath &propertyPath)
    : TransformInterpolator(propertyPath), defaultValue_(defaultValue) {}

} // namespace reanimated

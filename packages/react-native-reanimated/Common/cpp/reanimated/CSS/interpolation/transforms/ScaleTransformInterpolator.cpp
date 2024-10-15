#include <reanimated/CSS/interpolation/transforms/ScaleTransformInterpolator.h>

namespace reanimated {

ScaleTransformInterpolator::ScaleTransformInterpolator(
    const double &defaultValue,
    const PropertyPath &propertyPath)
    : TransformInterpolator(propertyPath), defaultValue_(defaultValue) {}

} // namespace reanimated

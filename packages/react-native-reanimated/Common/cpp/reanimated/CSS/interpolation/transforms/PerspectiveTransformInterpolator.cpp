#include <reanimated/CSS/interpolation/transforms/PerspectiveTransformInterpolator.h>

namespace reanimated {

PerspectiveTransformInterpolator::PerspectiveTransformInterpolator(
    const double &defaultValue,
    const PropertyPath &propertyPath)
    : TransformInterpolator(propertyPath), defaultValue_(defaultValue) {}

} // namespace reanimated

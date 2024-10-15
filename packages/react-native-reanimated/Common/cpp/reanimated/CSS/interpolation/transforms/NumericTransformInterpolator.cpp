#include <reanimated/CSS/interpolation/transforms/NumericTransformInterpolator.h>

namespace reanimated {

NumericTransformInterpolator::NumericTransformInterpolator(
    const double &defaultValue,
    const PropertyPath &propertyPath)
    : TransformInterpolator(propertyPath), defaultValue_(defaultValue) {}

} // namespace reanimated

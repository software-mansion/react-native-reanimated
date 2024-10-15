#include <reanimated/CSS/interpolation/transforms/RotateTransformInterpolator.h>

namespace reanimated {

RotateTransformInterpolator::RotateTransformInterpolator(
    const AngleValue &defaultValue,
    const PropertyPath &propertyPath)
    : TransformInterpolator(propertyPath), defaultValue_(defaultValue) {}

} // namespace reanimated

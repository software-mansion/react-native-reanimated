#include <reanimated/CSS/interpolation/transforms/SkewTransformInterpolator.h>

namespace reanimated {

SkewTransformInterpolator::SkewTransformInterpolator(
    const AngleValue &defaultValue,
    const PropertyPath &propertyPath)
    : TransformInterpolator(propertyPath), defaultValue_(defaultValue) {}

} // namespace reanimated

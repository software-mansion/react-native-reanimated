#include <reanimated/CSS/interpolation/transforms/AngleTransformInterpolator.h>

namespace reanimated {

AngleTransformInterpolator::AngleTransformInterpolator(
    const AngleValue &defaultValue,
    const PropertyPath &propertyPath)
    : TransformInterpolator(propertyPath), defaultValue_(defaultValue) {}

} // namespace reanimated

#include <reanimated/CSS/interpolation/transforms/RelativeOrNumericTransformInterpolator.h>

namespace reanimated {

RelativeOrNumericTransformInterpolator::RelativeOrNumericTransformInterpolator(
    const RelativeTo relativeTo,
    const std::string &relativeProperty,
    const UnitValue &defaultValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const PropertyPath &propertyPath)
    : TransformInterpolator(propertyPath),
      relativeTo_(relativeTo),
      relativeProperty_(relativeProperty),
      defaultValue_(defaultValue),
      viewStylesRepository_(viewStylesRepository) {}

} // namespace reanimated

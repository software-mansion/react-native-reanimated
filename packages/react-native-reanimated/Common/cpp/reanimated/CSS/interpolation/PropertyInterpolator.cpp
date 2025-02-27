#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

namespace reanimated {

PropertyInterpolator::PropertyInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : propertyPath_(propertyPath),
      viewStylesRepository_(viewStylesRepository) {}

bool PropertyInterpolatorFactory::isDiscreteProperty() const {
  return false;
}

} // namespace reanimated

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

#include <utility>

namespace reanimated::css {

PropertyInterpolator::PropertyInterpolator(
    PropertyPath propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : propertyPath_(std::move(propertyPath)),
      viewStylesRepository_(viewStylesRepository) {}

bool PropertyInterpolatorFactory::isDiscreteProperty() const {
  return false;
}

} // namespace reanimated::css

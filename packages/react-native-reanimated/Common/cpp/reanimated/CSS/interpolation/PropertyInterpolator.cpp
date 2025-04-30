#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

#include <utility>

namespace reanimated::css {

PropertyInterpolator::PropertyInterpolator(PropertyPath propertyPath)
    : propertyPath_(std::move(propertyPath)) {}

bool PropertyInterpolatorFactory::isDiscreteProperty() const {
  return false;
}

} // namespace reanimated::css

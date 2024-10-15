#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

namespace reanimated {

std::shared_ptr<PropertyInterpolator> createPropertyInterpolator(
    const std::string &propertyName,
    const std::vector<std::string> &propertyPath,
    const PropertiesInterpolatorFactories &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

} // namespace reanimated

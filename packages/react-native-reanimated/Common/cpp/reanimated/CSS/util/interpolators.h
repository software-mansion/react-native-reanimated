#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

namespace reanimated {

std::shared_ptr<Interpolator> createInterpolator(
    const std::string &propertyName,
    const std::vector<std::string> &propertyPath,
    const PropertiesInterpolatorFactories &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

} // namespace reanimated

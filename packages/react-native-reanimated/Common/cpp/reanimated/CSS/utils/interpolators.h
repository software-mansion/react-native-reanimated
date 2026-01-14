#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

std::shared_ptr<PropertyInterpolator> createPropertyInterpolator(
    const std::string &propertyName,
    const std::vector<std::string> &propertyPath,
    const InterpolatorFactoriesRecord &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

std::shared_ptr<PropertyInterpolator> createPropertyInterpolator(
    size_t arrayIndex,
    const std::vector<std::string> &propertyPath,
    const InterpolatorFactoriesArray &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

} // namespace reanimated::css

#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>

#include <memory>

namespace reanimated::css::svg {

/**
 * Transform interpolators
 */
std::shared_ptr<PropertyInterpolatorFactory> transforms(
    const std::unordered_map<
        std::string,
        std::shared_ptr<TransformInterpolator>> &interpolators);

} // namespace reanimated::css::svg

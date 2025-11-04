#pragma once

#include <string>

namespace reanimated::css {

    enum class FilterOp {
        blur,
        brightness,
        contrast,
        dropShadow,
        grayscale,
        hueRotate,
        invert,
        opacity,
        saturate,
        sepia
    };

    FilterOp getFilterOperationType(const std::string &property);

    std::string getOperationNameFromType(const FilterOp type);

} // namespace reanimated::css
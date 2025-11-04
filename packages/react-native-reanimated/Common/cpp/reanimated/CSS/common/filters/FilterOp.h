#pragma once

#include <string>

namespace reanimated::css {

enum class FilterOp { Blur, Brightness, Contrast, DropShadow, Grayscale, HueRotate, Invert, Opacity, Saturate, Sepia };

FilterOp getFilterOperationType(const std::string &property);

std::string getOperationNameFromType(const FilterOp type);

} // namespace reanimated::css

#pragma once

#include <string>

namespace reanimated::css {

enum class FilterOp : uint8_t {
  Blur,
  Brightness,
  Contrast,
  DropShadow,
  Grayscale,
  HueRotate,
  Invert,
  Opacity,
  Saturate,
  Sepia
};

FilterOp getFilterOperationType(const std::string &property);
std::string getFilterOperationName(const FilterOp type);

} // namespace reanimated::css

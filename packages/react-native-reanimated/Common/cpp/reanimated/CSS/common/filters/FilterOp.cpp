#include <reanimated/CSS/common/filters/FilterOp.h>

#include <array>
#include <string>
#include <unordered_map>

namespace reanimated::css {

constexpr std::array<const char *, 10> filterOperationStrings = {
    "blur",
    "brightness",
    "contrast",
    "dropShadow",
    "grayscale",
    "hueRotate",
    "invert",
    "opacity",
    "saturate",
    "sepia"};

FilterOp getFilterOperationType(const std::string &property) {
  static const std::unordered_map<std::string, FilterOp> stringToEnumMap = {
      {"blur", FilterOp::Blur},
      {"brightness", FilterOp::Brightness},
      {"contrast", FilterOp::Contrast},
      {"dropShadow", FilterOp::DropShadow},
      {"grayscale", FilterOp::Grayscale},
      {"hueRotate", FilterOp::HueRotate},
      {"invert", FilterOp::Invert},
      {"opacity", FilterOp::Opacity},
      {"saturate", FilterOp::Saturate},
      {"sepia", FilterOp::Sepia}};

  auto it = stringToEnumMap.find(property);
  if (it != stringToEnumMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument("[Reanimated] Unknown filter operation: " + property);
  }
}

std::string getFilterOperationName(const FilterOp type) {
  return filterOperationStrings[static_cast<uint8_t>(type)];
}

} // namespace reanimated::css

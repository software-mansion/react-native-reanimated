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
    {"blur", FilterOp::blur},
    {"brightness", FilterOp::brightness},
    {"contrast", FilterOp::contrast},
    {"dropShadow", FilterOp::dropShadow},
    {"grayscale", FilterOp::grayscale},
    {"hueRotate", FilterOp::hueRotate},
    {"invert", FilterOp::invert},
    {"opacity", FilterOp::opacity},
    {"saturate", FilterOp::saturate},
    {"sepia", FilterOp::sepia}};

  auto it = stringToEnumMap.find(property);
  if (it != stringToEnumMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument("[Reanimated] Unknown filter operation: " + property);
  };
};

std::string getOperationNameFromType(const FilterOp type) {
  return filterOperationStrings[static_cast<size_t>(type)];
};

} // namespace reanimated::css


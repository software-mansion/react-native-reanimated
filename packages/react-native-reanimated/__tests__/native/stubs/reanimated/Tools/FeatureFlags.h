#pragma once
#include <string_view>
namespace reanimated {
struct StaticFeatureFlags {
  static constexpr bool getFlag(std::string_view) {
    return false;
  }
};
} // namespace reanimated

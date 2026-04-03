#pragma once

#include <optional>
#include <string>

namespace reanimated {

enum class PseudoSelector : std::uint8_t {
  Active = 0,
  Focus = 1,
  Hover = 2,
};

inline std::optional<PseudoSelector> pseudoSelectorFromString(const std::string &s) {
  if (s == ":active") {
    return PseudoSelector::Active;
  }
  if (s == ":focus") {
    return PseudoSelector::Focus;
  }
  if (s == ":hover") {
    return PseudoSelector::Hover;
  }
  return std::nullopt;
}

} // namespace reanimated

#pragma once

#include <optional>
#include <string>

namespace reanimated {

enum class PseudoSelector : std::uint8_t {
  FocusWithin = 0,
  Focus = 1,
  Hover = 2,
  Active = 3,
  ActiveDeepest = 4,
};

inline std::optional<PseudoSelector> pseudoSelectorFromString(const std::string &s) {
  if (s == ":focus-within") {
    return PseudoSelector::FocusWithin;
  }
  if (s == ":focus") {
    return PseudoSelector::Focus;
  }
  if (s == ":hover") {
    return PseudoSelector::Hover;
  }
  if (s == ":active") {
    return PseudoSelector::Active;
  }
  if (s == ":active-deepest") {
    return PseudoSelector::ActiveDeepest;
  }
  return std::nullopt;
}

} // namespace reanimated

#pragma once

#include <optional>
#include <string>

namespace reanimated {

// Defines all supported selectors and their merge priority (last = highest priority).
// When you update this remember to also change kPseudoSelectorBits so it uses the last value
enum class PseudoSelector : std::uint8_t {
  FocusWithin = 0,
  Focus = 1,
  Hover = 2,
  Active = 3,
  ActiveDeepest = 4,
};

inline constexpr int kPseudoSelectorBits = static_cast<int>(PseudoSelector::ActiveDeepest) + 1;

using PseudoSelectorMask = std::uint8_t;

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

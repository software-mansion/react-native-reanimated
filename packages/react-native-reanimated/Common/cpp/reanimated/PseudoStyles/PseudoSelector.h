#pragma once

#include <cstdint>
#include <optional>
#include <string>

namespace reanimated {

// Defines all supported selectors and their merge priority (last = highest priority).
enum class PseudoSelector : std::uint8_t {
  FocusWithin = 0,
  Focus = 1,
  Hover = 2,
  Active = 3,
  ActiveDeepest = 4,
};

// Names the view whose selector states drive the selectors of the views that follow it.
using PseudoGroup = std::int32_t;

// A selector matched against the view itself, or against the view that hosts `group`.
struct PseudoSelectorKey {
  PseudoSelector selector;
  std::optional<PseudoGroup> group;

  bool operator==(const PseudoSelectorKey &other) const = default;

  // Merge order: every group selector below the view's own, each kind in selector priority.
  bool operator<(const PseudoSelectorKey &other) const {
    if (group.has_value() != other.group.has_value()) {
      return group.has_value();
    }
    if (selector != other.selector) {
      return selector < other.selector;
    }
    return group < other.group;
  }
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

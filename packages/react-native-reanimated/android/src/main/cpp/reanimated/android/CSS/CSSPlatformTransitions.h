#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/utils/platform.h>
#include <reanimated/CSS/utils/reversingShortening.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <cstdint>
#include <functional>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

using namespace facebook::react;

/// Carries the curve's own points rather than a sampled table, so a discontinuous
/// steps() survives at any duration.
struct PlatformEasing {
  enum class Type : std::uint8_t { Linear = 0, CubicBezier = 1, Steps = 2, LinearStops = 3 };

  Type type;
  std::vector<float> pointsX;
  std::vector<float> pointsY;
};

class CSSPlatformTransitions {
 public:
  /// Returns false when the view can't carry the animation, in which case the
  /// property falls back to the loop. A `persistent` transition has no committed
  /// style behind it, so its value must outlive the animation itself.
  using AnimateFunction = std::function<bool(
      int viewTag,
      const std::string &propertyName,
      double fromValue,
      double toValue,
      double durationMs,
      double startTimestampMs,
      const PlatformEasing &easing,
      bool persistent)>;
  using RemoveFunction = std::function<void(int viewTag, const std::string &propertyName)>;

  CSSPlatformTransitions(AnimateFunction animate, RemoveFunction remove);

  /// A null `settings` marks the pseudo-selector toggle path, which carries none of
  /// its own and reuses whatever the last config apply stored. A settings-only config
  /// change does not re-apply, so those can be a revision behind.
  bool applyTransition(
      Tag viewTag,
      const std::string &propertyName,
      const css::PlatformValue &fromValue,
      const css::PlatformValue &toValue,
      const css::CSSTransitionPropertySettings *settings,
      bool persistent,
      double timestamp);

  void removeTransition(Tag viewTag, const std::string &propertyName);

 private:
  struct ActiveTransition {
    std::optional<css::PlatformValue> adjustedStart;
    css::PlatformValue adjustedEnd;
    css::ReversingState reversing;
    css::CSSTransitionPropertySettings settings;
  };

  const ActiveTransition *activeTransitionFor(Tag viewTag, const std::string &propertyName) const;

  std::unordered_map<Tag, std::unordered_map<std::string, ActiveTransition>> active_;
  AnimateFunction animate_;
  RemoveFunction remove_;
};

} // namespace reanimated

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

/// A CSS easing described exactly rather than sampled: `type` selects the curve
/// and the point arrays carry its parameters. Kotlin rebuilds the interpolator,
/// so steps() keeps its discontinuities at any duration.
struct PlatformEasing {
  enum class Type : std::uint8_t { Linear = 0, CubicBezier = 1, Steps = 2, LinearStops = 3 };

  Type type;
  std::vector<float> pointsX;
  std::vector<float> pointsY;
};

/// Android counterpart of REACSSPlatformTransitions. Owns the per-property state
/// CSS reversing needs and resolves the timeline for the Kotlin animator.
class CSSPlatformTransitions {
 public:
  /// Returns false when the view can't carry the animation, in which case the
  /// property falls back to the loop.
  using AnimateFunction = std::function<bool(
      int viewTag,
      const std::string &propertyName,
      double fromValue,
      double toValue,
      double durationMs,
      double elapsedMs,
      const PlatformEasing &easing)>;
  using RemoveFunction = std::function<void(int viewTag, const std::string &propertyName)>;

  CSSPlatformTransitions(AnimateFunction animate, RemoveFunction remove);

  /// A null `settings` marks the pseudo-selector toggle path, which reuses the
  /// settings stored by the config apply. Returns false when there are none.
  bool applyTransition(
      Tag viewTag,
      const std::string &propertyName,
      const css::PlatformValue &fromValue,
      const css::PlatformValue &toValue,
      const css::CSSTransitionPropertySettings *settings,
      double timestamp);

  void removeTransition(Tag viewTag, const std::string &propertyName);

 private:
  // adjustedStart/adjustedEnd drive reversal detection; settings serve the
  // toggle path.
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

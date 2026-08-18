#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/utils/platform.h>
#include <reanimated/CSS/utils/reversingShortening.h>
#include <reanimated/android/CSS/CSSPlatformEasings.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <cstdint>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

using namespace facebook::react;

class CSSPlatformTransitions {
 public:
  /// False means the property falls back to the loop.
  using AnimateFunction = std::function<bool(
      int viewTag,
      int propertyId,
      double fromValue,
      double toValue,
      double durationMs,
      double startTimestampMs,
      int easingId,
      bool persistent)>;
  using RemoveFunction = std::function<void(int viewTag, int propertyId)>;

  CSSPlatformTransitions(AnimateFunction animate, RemoveFunction remove, std::shared_ptr<CSSPlatformEasings> easings);

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

  /// nullopt after a non-reversing interruption, which resumed from the live view value.
  std::optional<css::PlatformValue> getCurrentValue(Tag viewTag, const std::string &propertyName, double timestamp)
      const;

 private:
  struct ActiveTransition {
    /// Reversing-adjusted start value: what a later reversal has to target. A reversal
    /// resumes from the live value, so this is not where the animator started.
    std::optional<css::PlatformValue> adjustedStart;
    /// Where the animator started, so getCurrentValue can retrace what it plays.
    std::optional<css::PlatformValue> startValue;
    css::PlatformValue adjustedEnd;
    css::ReversingState reversing;
    css::CSSTransitionPropertySettings settings;
    int easingId;
  };

  const ActiveTransition *activeTransitionFor(Tag viewTag, const std::string &propertyName) const;

  std::unordered_map<Tag, std::unordered_map<std::string, ActiveTransition>> active_;
  std::shared_ptr<CSSPlatformEasings> easings_;
  AnimateFunction animate_;
  RemoveFunction remove_;
};

} // namespace reanimated

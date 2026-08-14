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
  /// False means the property falls back to the loop. Ids and scalars only, so the
  /// per-transition JNI hop allocates nothing.
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

 private:
  struct ActiveTransition {
    std::optional<css::PlatformValue> adjustedStart;
    css::PlatformValue adjustedEnd;
    css::ReversingState reversing;
    css::CSSTransitionPropertySettings settings;
    /// Keeps the curve's slot alive for as long as this property is routed.
    int easingId;
  };

  const ActiveTransition *activeTransitionFor(Tag viewTag, const std::string &propertyName) const;

  std::unordered_map<Tag, std::unordered_map<std::string, ActiveTransition>> active_;
  /// Shared, so a future platform animation kind interns against the same table.
  std::shared_ptr<CSSPlatformEasings> easings_;
  AnimateFunction animate_;
  RemoveFunction remove_;
};

} // namespace reanimated

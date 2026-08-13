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

  bool operator==(const PlatformEasing &other) const = default;
};

struct PlatformEasingHash {
  std::size_t operator()(const PlatformEasing &easing) const;
};

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

  /// Carries the curve with the transition, for the rare start that finds no interning slot.
  /// The platform still plays it; only the marshalling saving is lost.
  using AnimateWithEasingFunction = std::function<bool(
      int viewTag,
      int propertyId,
      double fromValue,
      double toValue,
      double durationMs,
      double startTimestampMs,
      int easingType,
      const std::vector<float> &pointsX,
      const std::vector<float> &pointsY,
      bool persistent)>;

  /// Registers a curve on the platform under an id.
  using DefineEasingFunction =
      std::function<void(int easingId, int type, const std::vector<float> &pointsX, const std::vector<float> &pointsY)>;

  CSSPlatformTransitions(
      AnimateFunction animate,
      AnimateWithEasingFunction animateWithEasing,
      RemoveFunction remove,
      DefineEasingFunction defineEasing);

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
    /// Keeps the curve's slot alive for as long as this property is routed, or -1 when the
    /// table was full and the curve travelled with the start instead of being interned.
    int easingId;
  };

  const ActiveTransition *activeTransitionFor(Tag viewTag, const std::string &propertyName) const;

  /// Interns the curve, registering it with the platform on first sight. An unused curve stays
  /// cached so a screen returning to it reuses the flattened interpolator; a full table instead
  /// reclaims the slot of one nothing routes any more. Returns nullopt only when all
  /// `kMaxInternedEasings` are simultaneously in use, and the curve then travels with the start.
  std::optional<int> easingIdFor(const PlatformEasing &easing);

  void retainEasing(int easingId);

  /// The slot stays populated at zero references; it is only reclaimed under pressure.
  void releaseEasing(int easingId);

  std::unordered_map<Tag, std::unordered_map<std::string, ActiveTransition>> active_;
  std::unordered_map<PlatformEasing, int, PlatformEasingHash> easingIds_;
  /// Indexed by easing id: the curve occupying the slot, and how many properties route with it.
  std::vector<PlatformEasing> easingKeys_;
  std::vector<int> easingRefs_;
  AnimateFunction animate_;
  AnimateWithEasingFunction animateWithEasing_;
  RemoveFunction remove_;
  DefineEasingFunction defineEasing_;
};

} // namespace reanimated

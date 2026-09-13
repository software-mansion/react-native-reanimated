#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>
#include <reanimated/CSS/utils/reversingShortening.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <functional>
#include <optional>
#include <string>
#include <unordered_map>
#include <variant>

namespace reanimated::css {

using namespace facebook;
using namespace react;

/// Starts a native transition. Returns false to fall back to the C++ loop.
/// `startTimestampMs` is absolute and may be in the past or future.
using CSSStartTransitionFunction = std::function<bool(
    Tag viewTag,
    const std::string &propertyName,
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    double durationMs,
    double startTimestampMs,
    const EasingConfig &easing,
    bool persistent)>;
using CSSStopTransitionFunction = std::function<void(Tag viewTag, const std::string &propertyName)>;

/// Properties routed to the platform and C++ loop.
struct CSSTransitionRouting {
  TransitionProperties platform;
  TransitionProperties loop;
};

struct CSSPlatformConfigResult {
  CSSTransitionConfig loopConfig;
  TransitionProperties resumedProperties;
};

struct CSSPlatformDynamicResult {
  PropertyValueDynamicDiffsMap loopDiffs;
  /// Settings restored when routing returns to the loop.
  PropertiesSettingsMap resumedSettings;
  TransitionProperties resumedProperties;
};

/// Routes CSS transitions between platform backends and the C++ loop.
class CSSPlatformTransitionProxy {
 public:
  CSSPlatformTransitionProxy(CSSStartTransitionFunction startTransition, CSSStopTransitionFunction stopTransition);

  /// Routes a transition config and returns the C++ loop remainder.
  CSSPlatformConfigResult processConfig(
      jsi::Runtime &rt,
      Tag viewTag,
      const CSSTransitionConfig &config,
      CSSTransitionRouting &routing,
      bool allowPlatform,
      double timestamp);

  /// Routes pseudo-selector diffs and returns the C++ loop remainder.
  CSSPlatformDynamicResult processDynamicDiffs(
      Tag viewTag,
      const PropertyValueDynamicDiffsMap &propertyDiffs,
      const TransitionProperties &pseudoLockedProperties,
      CSSTransitionRouting &routing,
      bool allowPlatform,
      double timestamp);

  void cancelAll(Tag viewTag, const TransitionProperties &properties);

 private:
  /// State required for interruption and reversal.
  struct ActiveTransition {
    /// Reversing-adjusted target used to detect reversals.
    std::optional<PlatformValue> adjustedStart;
    /// Timeline start used to sample the current value.
    std::optional<PlatformValue> startValue;
    PlatformValue adjustedEnd;
    ReversingState reversing;
    CSSTransitionPropertySettings settings;
  };

  bool canRoute(const std::string &propertyName, const EasingConfig &easing) const;
  /// Null settings reuse the active transition's settings.
  bool apply(
      Tag viewTag,
      const std::string &propertyName,
      const PlatformValue &fromValue,
      const PlatformValue &toValue,
      const CSSTransitionPropertySettings *settings,
      bool persistent,
      double timestamp);
  void remove(Tag viewTag, const std::string &propertyName);
  bool updateSettings(Tag viewTag, const std::string &propertyName, const CSSTransitionPropertySettings &settings);

  const ActiveTransition *activeTransitionFor(Tag viewTag, const std::string &propertyName) const;
  /// Samples the current value from the stored timeline.
  std::optional<PlatformValue> getCurrentValue(Tag viewTag, const std::string &propertyName, double timestamp) const;
  std::optional<folly::dynamic> getResumeValue(Tag viewTag, const std::string &propertyName, double timestamp) const;

  CSSStartTransitionFunction startTransition_;
  CSSStopTransitionFunction stopTransition_;
  std::unordered_map<Tag, std::unordered_map<std::string, ActiveTransition>> active_;
};

} // namespace reanimated::css

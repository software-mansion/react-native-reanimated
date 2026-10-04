#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <cstdint>
#include <functional>
#include <optional>
#include <string>

namespace reanimated::css {

using namespace facebook;
using namespace react;

/// Identifies one native run, so a late report about an old run cannot reach its replacement.
using CSSPlatformTransitionRunId = uint64_t;

struct CSSPlatformTransitionRun {
  SurfaceId surfaceId;
  Tag viewTag;
  std::string propertyName;
  PlatformValue fromValue;
  PlatformValue toValue;
  double durationMs;
  /// Can lie in the past when the run continues an interrupted one.
  double startTimestampMs;
  EasingConfig easing;
  /// No committed style backs the target, so the platform must keep the end value after the run.
  bool holdsEndValue;
};

/// Native driver for CSS transitions. A platform supplies one only when its
/// native transitions are enabled; without one every property runs on the C++ loop.
class CSSPlatformTransitionBackend {
 public:
  using RunEndedListener =
      std::function<void(Tag viewTag, const std::string &propertyName, CSSPlatformTransitionRunId runId)>;

  virtual ~CSSPlatformTransitionBackend() = default;

  /// The listener hears, with no lock held, about each run that the platform ended and CSS
  /// did not stop. A platform that never ends a run on its own ignores it.
  virtual void setRunEndedListener(RunEndedListener /*listener*/) {}

  /// Whether the property can animate natively with the given easing.
  virtual bool canRoute(const std::string &propertyName, const EasingConfig &easing) const = 0;

  /// Nullopt falls back to the loop.
  virtual std::optional<CSSPlatformTransitionRunId> startTransition(const CSSPlatformTransitionRun &run) = 0;

  virtual void stopTransition(SurfaceId surfaceId, Tag viewTag, const std::string &propertyName) = 0;
};

} // namespace reanimated::css

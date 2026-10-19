#include <reanimated/CSS/core/transition/CSSHostTransitionBackend.h>

#include <algorithm>
#include <array>
#include <cstdint>
#include <map>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>
#include <variant>
#include <vector>

namespace reanimated::css {

using namespace native_animation;

namespace {

struct TimingKindVisitor {
  AnimationTimingKind operator()(const LinearEasing &) const {
    return AnimationTimingKind::Linear;
  }
  AnimationTimingKind operator()(const CubicBezierEasing &) const {
    return AnimationTimingKind::CubicBezier;
  }
  AnimationTimingKind operator()(const StepsEasing &) const {
    return AnimationTimingKind::Steps;
  }
  AnimationTimingKind operator()(const LinearStopsEasing &) const {
    return AnimationTimingKind::LinearStops;
  }
};

AnimationTimingKind timingKindOf(const EasingConfig &easing) {
  return std::visit(TimingKindVisitor{}, easing);
}

struct AnimationTimingVisitor {
  AnimationTiming operator()(const LinearEasing &) const {
    return LinearTiming{};
  }
  AnimationTiming operator()(const CubicBezierEasing &bezier) const {
    return CubicBezierTiming{bezier.x1, bezier.y1, bezier.x2, bezier.y2};
  }
  AnimationTiming operator()(const StepsEasing &steps) const {
    return StepsTiming{steps.pointsX, steps.pointsY};
  }
  AnimationTiming operator()(const LinearStopsEasing &stops) const {
    return LinearStopsTiming{stops.pointsX, stops.pointsY};
  }
};

AnimationTiming animationTiming(const EasingConfig &easing) {
  return std::visit(AnimationTimingVisitor{}, easing);
}

struct AnimationValueVisitor {
  AnimationValue operator()(const double scalar) const {
    return scalar;
  }
  AnimationValue operator()(const std::array<double, 2> &size) const {
    return AnimationSize{size[0], size[1]};
  }
  AnimationValue operator()(const std::array<double, 4> &color) const {
    return AnimationColor{color[0], color[1], color[2], color[3]};
  }
};

AnimationValue animationValue(const PlatformValue &value) {
  return std::visit(AnimationValueVisitor{}, value);
}

class CSSHostTransitionBackend final : public CSSPlatformTransitionBackend,
                                       public NativeAnimationClient,
                                       public std::enable_shared_from_this<CSSHostTransitionBackend> {
 public:
  CSSHostTransitionBackend(const std::shared_ptr<NativeAnimationHost> &host, CSSPlatformRouteTable routeTable)
      : host_(host), routeTable_(std::move(routeTable)) {}

  void setRunEndedListener(RunEndedListener listener) override {
    runEndedListener_ = std::move(listener);
  }

  bool canRoute(const std::string &propertyName, const EasingConfig &easing) const override {
    return targetOf(propertyName) && plays(timingKindOf(easing));
  }

  std::optional<CSSPlatformTransitionRunId> startTransition(const CSSPlatformTransitionRun &run) override {
    auto track = buildTrack(run);
    if (std::holds_alternative<TrackBuildFailure>(track)) {
      return std::nullopt;
    }

    AnimationHandle handle;
    {
      const std::lock_guard lock(runsMutex_);
      handle = {run.surfaceId, run.viewTag, AnimationOwner::CSSTransition, nextGeneration_++};
      runs_[{run.surfaceId, run.viewTag}][run.propertyName].push_back(handle);
    }
    host_->start({handle, run.startTimestampMs, {std::get<AnimationTrack>(std::move(track))}}, weak_from_this());
    return handle.generation;
  }

  void stopTransition(const SurfaceId surfaceId, const Tag viewTag, const std::string &propertyName) override {
    for (const auto &handle : takeRuns({surfaceId, viewTag}, propertyName)) {
      host_->cancel(handle, TrackStopMode::KeepVisibleValue);
    }
  }

  void onAnimationAdmitted(const AnimationHandle &) override {}

  void onTrackEnded(const TrackKey &, TrackEnd) override {}

  void onAnimationEnded(const AnimationHandle &handle, const AnimationResult result) override {
    const auto hostEndedRun = takeEndedRun(handle, result);
    if (!hostEndedRun) {
      return;
    }
    for (const auto &olderHandle : hostEndedRun->olderRuns) {
      host_->cancel(olderHandle, TrackStopMode::KeepVisibleValue);
    }
    runEndedListener_(handle.tag, hostEndedRun->propertyName, handle.generation);
  }

 private:
  using ViewKey = std::pair<SurfaceId, Tag>;
  /// The commands of one property that have no result, oldest first. A replacement and the run that it
  /// replaces are both here until the host admits or rejects the replacement.
  using Runs = std::vector<AnimationHandle>;
  using PropertyRuns = std::unordered_map<std::string, Runs>;

  /// A run that the host ended and that CSS must continue on the loop.
  struct HostEndedRun {
    std::string propertyName;
    /// Earlier runs of the property that still play.
    Runs olderRuns;
  };

  std::optional<AnimationTarget> targetOf(const std::string &propertyName) const {
    const auto it = routeTable_.targets.find(propertyName);
    return it != routeTable_.targets.end() ? std::optional(it->second) : std::nullopt;
  }

  bool plays(const AnimationTimingKind timingKind) const {
    return std::ranges::find(routeTable_.timingKinds, timingKind) != routeTable_.timingKinds.end();
  }

  std::variant<AnimationTrack, TrackBuildFailure> buildTrack(const CSSPlatformTransitionRun &run) const {
    const auto target = targetOf(run.propertyName);
    if (!target) {
      return TrackBuildFailure::UnsupportedTarget;
    }
    if (!plays(timingKindOf(run.easing))) {
      return TrackBuildFailure::UnsupportedTiming;
    }
    AnimationTrack track{
        .target = *target,
        .body =
            ValueTimeline{
                .start = VisualValueIfInterrupting{animationValue(run.fromValue)},
                .segments =
                    {{.endOffset = 1,
                      .endValue = animationValue(run.toValue),
                      .timingFromPrevious = animationTiming(run.easing)}},
            },
        .durationMs = run.durationMs,
        .endpointPolicy =
            run.holdsEndValue ? EndpointPolicy::HoldWithoutCommit : EndpointPolicy::ExecutorCommitsEndpoint,
    };
    if (const auto failure = validateTrack(track)) {
      return *failure;
    }
    return track;
  }

  static bool mustContinueOnLoop(const AnimationResult result) {
    return result.outcome == AnimationOutcome::Rejected ||
        (result.outcome == AnimationOutcome::Interrupted && result.reason != AnimationResultReason::PlatformRemoved);
  }

  Runs takeRuns(const ViewKey &view, const std::string &propertyName) {
    const std::lock_guard lock(runsMutex_);
    const auto viewIt = runs_.find(view);
    if (viewIt == runs_.end()) {
      return {};
    }
    auto propertyNode = viewIt->second.extract(propertyName);
    if (viewIt->second.empty()) {
      runs_.erase(viewIt);
    }
    return propertyNode ? std::move(propertyNode.mapped()) : Runs{};
  }

  /// Drops the record of the command. CSS follows only the newest run of a property, so the result of an
  /// earlier run gives nullopt.
  std::optional<HostEndedRun> takeEndedRun(const AnimationHandle &handle, const AnimationResult result) {
    const std::lock_guard lock(runsMutex_);
    const auto viewIt = runs_.find({handle.surfaceId, handle.tag});
    if (viewIt == runs_.end()) {
      return std::nullopt;
    }
    auto &properties = viewIt->second;
    const auto propertyIt = std::ranges::find_if(properties, [&handle](const PropertyRuns::value_type &property) {
      return std::ranges::find(property.second, handle) != property.second.end();
    });
    if (propertyIt == properties.end()) {
      return std::nullopt;
    }

    auto &runs = propertyIt->second;
    const bool isNewest = runs.back() == handle;
    std::optional<HostEndedRun> hostEndedRun;
    if (isNewest && mustContinueOnLoop(result)) {
      runs.pop_back();
      hostEndedRun = HostEndedRun{propertyIt->first, std::move(runs)};
      runs.clear();
    } else {
      std::erase(runs, handle);
    }
    if (runs.empty()) {
      properties.erase(propertyIt);
    }
    if (properties.empty()) {
      runs_.erase(viewIt);
    }
    return hostEndedRun;
  }

  const std::shared_ptr<NativeAnimationHost> host_;
  const CSSPlatformRouteTable routeTable_;
  RunEndedListener runEndedListener_;

  std::mutex runsMutex_;
  std::map<ViewKey, PropertyRuns> runs_;
  uint64_t nextGeneration_{0};
};

} // namespace

std::shared_ptr<CSSPlatformTransitionBackend> makeCSSHostTransitionBackend(
    const std::shared_ptr<NativeAnimationHost> &host,
    CSSPlatformRouteTable routeTable) {
  return std::make_shared<CSSHostTransitionBackend>(host, std::move(routeTable));
}

} // namespace reanimated::css

#import <reanimated/apple/CSS/REACSSPlatformTransitionBackend.h>
#import <reanimated/apple/NativeAnimations/REANativeAnimationPlatform.h>

#import <algorithm>
#import <map>
#import <mutex>
#import <optional>
#import <string>
#import <unordered_map>
#import <utility>
#import <variant>
#import <vector>

namespace reanimated::css {

using namespace native_animation;

namespace {

std::optional<AnimationTarget> targetForProperty(const std::string &propertyName)
{
  // TODO: border props snap when RN rasterizes the border (the view fails
  // useCoreAnimationBorderRendering); route them only when the layer draws them.
  static const std::unordered_map<std::string, AnimationTarget> kTargets = {
      {"opacity", AnimationTarget::Opacity},
      {"backgroundColor", AnimationTarget::BackgroundColor},
      {"borderColor", AnimationTarget::BorderColor},
      {"borderRadius", AnimationTarget::BorderRadius},
      {"shadowColor", AnimationTarget::ShadowColor},
      {"shadowOpacity", AnimationTarget::ShadowOpacity},
      {"shadowRadius", AnimationTarget::ShadowRadius},
      {"shadowOffset", AnimationTarget::ShadowOffset},
  };
  const auto it = kTargets.find(propertyName);
  return it != kTargets.end() ? std::optional(it->second) : std::nullopt;
}

// CAMediaTimingFunction carries only linear and cubic-bezier curves.
std::optional<AnimationTiming> timingForEasing(const EasingConfig &easing)
{
  if (std::holds_alternative<LinearEasing>(easing)) {
    return LinearTiming{};
  }
  if (const auto *bezier = std::get_if<CubicBezierEasing>(&easing)) {
    return CubicBezierTiming{bezier->x1, bezier->y1, bezier->x2, bezier->y2};
  }
  return std::nullopt;
}

struct AnimationValueVisitor {
  AnimationValue operator()(const double scalar) const
  {
    return scalar;
  }
  AnimationValue operator()(const std::array<double, 2> &size) const
  {
    return AnimationSize{size[0], size[1]};
  }
  AnimationValue operator()(const std::array<double, 4> &color) const
  {
    return AnimationColor{color[0], color[1], color[2], color[3]};
  }
};

AnimationValue animationValue(const PlatformValue &value)
{
  return std::visit(AnimationValueVisitor{}, value);
}

std::variant<AnimationTrack, TrackBuildFailure> buildTrack(const CSSPlatformTransitionRun &run)
{
  const auto target = targetForProperty(run.propertyName);
  if (!target) {
    return TrackBuildFailure::UnsupportedTarget;
  }
  const auto timing = timingForEasing(run.easing);
  if (!timing) {
    return TrackBuildFailure::UnsupportedTiming;
  }
  AnimationTrack track{
      .target = *target,
      .start = VisualValueIfInterrupting{animationValue(run.fromValue)},
      .segments = {{.endOffset = 1, .endValue = animationValue(run.toValue), .timingFromPrevious = *timing}},
      .durationMs = run.durationMs,
      .endpointPolicy = run.holdsEndValue ? EndpointPolicy::HoldWithoutCommit : EndpointPolicy::ExecutorCommitsEndpoint,
  };
  if (const auto failure = validateTrack(track)) {
    return *failure;
  }
  if (!canPlayWithCoreAnimation(track)) {
    return TrackBuildFailure::UnsupportedTrackForm;
  }
  return track;
}

class REACSSPlatformTransitionBackend final : public CSSPlatformTransitionBackend,
                                              public NativeAnimationClient,
                                              public std::enable_shared_from_this<REACSSPlatformTransitionBackend> {
 public:
  explicit REACSSPlatformTransitionBackend(const std::shared_ptr<NativeAnimationHost> &host) : host_(host) {}

  void setRunEndedListener(RunEndedListener listener) override
  {
    runEndedListener_ = std::move(listener);
  }

  bool canRoute(const std::string &propertyName, const EasingConfig &easing) const override
  {
    return targetForProperty(propertyName) && timingForEasing(easing);
  }

  std::optional<CSSPlatformTransitionRunId> startTransition(const CSSPlatformTransitionRun &run) override
  {
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

  void stopTransition(const SurfaceId surfaceId, const Tag viewTag, const std::string &propertyName) override
  {
    for (const auto &handle : takeRuns({surfaceId, viewTag}, propertyName)) {
      host_->cancel(handle, TrackStopMode::KeepVisibleValue);
    }
  }

  void onAnimationAdmitted(const AnimationHandle &) override {}

  void onTrackEnded(const TrackKey &, TrackEnd) override {}

  void onAnimationEnded(const AnimationHandle &handle, const AnimationResult result) override
  {
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

  static bool mustContinueOnLoop(const AnimationResult result)
  {
    return result.outcome == AnimationOutcome::Rejected ||
        (result.outcome == AnimationOutcome::Interrupted && result.reason != AnimationResultReason::PlatformRemoved);
  }

  Runs takeRuns(const ViewKey &view, const std::string &propertyName)
  {
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
  std::optional<HostEndedRun> takeEndedRun(const AnimationHandle &handle, const AnimationResult result)
  {
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
  RunEndedListener runEndedListener_;

  std::mutex runsMutex_;
  std::map<ViewKey, PropertyRuns> runs_;
  uint64_t nextGeneration_{0};
};

} // namespace

std::shared_ptr<CSSPlatformTransitionBackend> makeCSSPlatformTransitionBackend(
    const std::shared_ptr<NativeAnimationHost> &host)
{
  return std::make_shared<REACSSPlatformTransitionBackend>(host);
}

} // namespace reanimated::css

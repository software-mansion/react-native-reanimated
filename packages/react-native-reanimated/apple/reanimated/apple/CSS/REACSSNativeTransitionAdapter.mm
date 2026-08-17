#import <reanimated/apple/CSS/REACSSNativeTransitionAdapter.h>

#import <reanimated/NativeAnimations/NativeAnimationValidation.h>
#import <reanimated/apple/CSS/REACSSNativeTransitionTiming.h>

#import <React/RCTAssert.h>
#import <React/RCTUtils.h>

#import <unordered_map>
#import <utility>
#import <variant>

namespace reanimated::css {

namespace {

using namespace native_animation;

CallbackScheduler mainQueueCallbackScheduler()
{
  return [](CallbackOperation operation) {
    auto sharedOperation = std::make_shared<CallbackOperation>(std::move(operation));
    RCTExecuteOnMainQueue(^{
      RCTAssertMainQueue();
      (*sharedOperation)();
    });
  };
}

std::optional<AnimationTarget> targetForProperty(const std::string &propertyName)
{
  static const std::unordered_map<std::string, AnimationTargetKind> targets = {
      {"opacity", AnimationTargetKind::Opacity},
      {"backgroundColor", AnimationTargetKind::BackgroundColor},
      {"shadowColor", AnimationTargetKind::ShadowColor},
      {"shadowOpacity", AnimationTargetKind::ShadowOpacity},
      {"shadowRadius", AnimationTargetKind::ShadowRadius},
      {"shadowOffset", AnimationTargetKind::ShadowOffset},
  };
  // The Apple resolver conservatively rejects border targets until capability
  // routing can prove that a mounted component exposes visible layer fields.
  const auto it = targets.find(propertyName);
  return it == targets.end() ? std::nullopt : std::optional<AnimationTarget>{{it->second}};
}

} // namespace

CSSNativeTransitionAdapter::CSSNativeTransitionAdapter(std::shared_ptr<NativeAnimationService> service)
    : service_(std::move(service))
{
}

std::optional<BuiltCSSNativeTransition> CSSNativeTransitionAdapter::build(
    const facebook::react::SurfaceId surfaceId,
    const facebook::react::Tag tag,
    const std::string &propertyName,
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    const EasingConfig &easing,
    const double delayMs,
    const double durationMs,
    const bool startFromCurrentValue)
{
  const auto target = targetForProperty(propertyName);
  // A common track cannot advance a negative delay from an unknown live value.
  if (!target || (startFromCurrentValue && delayMs < 0)) {
    return std::nullopt;
  }

  const auto resolvedTiming = resolveCSSNativeTransitionTiming(fromValue, toValue, easing, delayMs, durationMs);
  if (!resolvedTiming) {
    return std::nullopt;
  }
  const AnimationStart start =
      startFromCurrentValue ? AnimationStart{CurrentVisualValue{}} : AnimationStart{resolvedTiming->startValue};
  AnimationTrack track{
      *target,
      start,
      {{1.0, toValue, resolvedTiming->timing}},
      resolvedTiming->delayMs,
      resolvedTiming->durationMs,
  };
  auto built = buildAnimationTrack(std::move(track));
  if (!std::holds_alternative<AnimationTrack>(built)) {
    return std::nullopt;
  }
  return BuiltCSSNativeTransition{
      nextHandle(surfaceId, tag),
      {{std::get<AnimationTrack>(std::move(built))}},
  };
}

void CSSNativeTransitionAdapter::schedule(
    BuiltCSSNativeTransition transition,
    AnimationAdmissionCallback admission,
    TerminalCallback terminal) const
{
  service_->schedule(
      {transition.handle, std::move(transition.plan), AnimationAdmissionMode::Normal},
      {mainQueueCallbackScheduler(), std::move(admission), std::move(terminal)});
}

void CSSNativeTransitionAdapter::cancel(const AnimationHandle handle) const
{
  service_->cancel(handle);
}

void CSSNativeTransitionAdapter::handoffAndRelease(const AnimationHandle handle, const std::string &propertyName)
{
  const auto target = targetForProperty(propertyName);
  if (!target) {
    return;
  }
  const AnimationHandle leaseHandle = nextHandle(handle.surfaceId, handle.tag);
  service_->handoffToExternal(
      handle,
      {leaseHandle, {*target}, AnimationAdmissionMode::Normal},
      {
          [service = service_, leaseHandle](const HandoffResult &result) {
            if (result.claim.status == ExternalClaimStatus::Granted) {
              service->releaseExternal(leaseHandle, AnimationOutcome::Cancelled);
            }
          },
          {mainQueueCallbackScheduler(), {}, {}},
      });
}

AnimationHandle CSSNativeTransitionAdapter::nextHandle(
    const facebook::react::SurfaceId surfaceId,
    const facebook::react::Tag tag)
{
  return {surfaceId, tag, AnimationOwner::CSSTransition, ++nextGeneration_};
}

} // namespace reanimated::css

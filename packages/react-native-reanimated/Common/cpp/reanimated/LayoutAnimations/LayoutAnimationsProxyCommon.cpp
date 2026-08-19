#include <ReactCommon/CallInvoker.h>
#include <folly/dynamic.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>
#include <reanimated/LayoutAnimations/LayoutNativeAnimationStructureParser.h>

#include <react/utils/hash_combine.h>

#if !defined(NDEBUG) && defined(IS_REANIMATED_EXAMPLE_APP)
#include <cstdio>
#endif

#include <algorithm>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace reanimated {

size_t LayoutAnimationsProxyCommon::FrameDrivenLeaseKeyHash::operator()(const FrameDrivenLeaseKey &key) const noexcept {
  return facebook::react::hash_combine(key.surfaceId, key.tag);
}

namespace {

struct LayoutPendingViewSnapshot final : public PendingLayoutViewSnapshot {
  LayoutPendingViewSnapshot(ShadowView oldView, ShadowView finalView)
      : oldView(std::move(oldView)), finalView(std::move(finalView)) {}

  ShadowView oldView;
  ShadowView finalView;
};

// Fallback is permitted only for a reason that does not mean a missing view,
// a superseded command, or denied ownership.
bool layoutPermitsFallback(const native_animation::AnimationResultReason reason) {
  switch (reason) {
    case native_animation::AnimationResultReason::UnsupportedTargetRealization:
    case native_animation::AnimationResultReason::CurrentValueUnavailable:
    case native_animation::AnimationResultReason::ExecutorError:
    case native_animation::AnimationResultReason::InvalidPlan:
    case native_animation::AnimationResultReason::ResourceLimit:
      return true;
    default:
      return false;
  }
}

#if !defined(NDEBUG) && defined(IS_REANIMATED_EXAMPLE_APP)

// Development sink that prints trace events to the console for bench evidence.
class StderrNativeAnimationTraceSink final : public native_animation::NativeAnimationTraceSink {
 public:
  void record(native_animation::NativeAnimationTraceEvent event) override {
    event.sequence = ++sequence_;
    std::fprintf(
        stderr,
        "[Reanimated.native-animation] seq=%llu event=%u surface=%d tag=%d owner=%u generation=%llu%s%s%s%s\n",
        static_cast<unsigned long long>(event.sequence),
        static_cast<unsigned>(event.event),
        event.handle.surfaceId,
        event.handle.tag,
        static_cast<unsigned>(event.handle.owner),
        static_cast<unsigned long long>(event.handle.generation),
        event.requestedRoute ? (" requestedRoute=" + std::to_string(*event.requestedRoute)).c_str() : "",
        event.selectedRoute ? (" selectedRoute=" + std::to_string(*event.selectedRoute)).c_str() : "",
        event.trackBuildFailureReason
            ? (" buildFailure=" + std::to_string(static_cast<unsigned>(*event.trackBuildFailureReason))).c_str()
            : "",
        event.outcome ? (" outcome=" + std::to_string(static_cast<unsigned>(*event.outcome)) + " reason=" +
                         std::to_string(static_cast<unsigned>(
                             event.reason.value_or(native_animation::AnimationResultReason::None))))
                            .c_str()
                      : "");
  }

 private:
  uint64_t sequence_{0};
};

#endif

} // namespace

#ifndef NDEBUG
std::shared_ptr<native_animation::NativeAnimationTraceSink> LayoutAnimationsProxyCommon::makeLayoutTraceSink() {
#ifdef IS_REANIMATED_EXAMPLE_APP
  if (useNativeLayoutAnimations()) {
    return std::make_shared<StderrNativeAnimationTraceSink>();
  }
#endif
  return std::make_shared<native_animation::NullNativeAnimationTraceSink>();
}
#endif

std::shared_ptr<PendingNativeLayoutStarts> LayoutAnimationsProxyCommon::makePendingNativeLayoutStarts(
    const std::shared_ptr<native_animation::NativeAnimationService> &nativeAnimationService,
    const std::shared_ptr<LayoutMountBoundary> &layoutMountBoundary
#ifndef NDEBUG
    ,
    const std::shared_ptr<native_animation::NativeAnimationTraceSink> &traceSink
#endif
) {
  if (!useNativeLayoutAnimations() || !nativeAnimationService || !layoutMountBoundary) {
    return nullptr;
  }
#ifndef NDEBUG
  auto pendingStarts = std::make_shared<PendingNativeLayoutStarts>(
      nativeAnimationService,
      layoutMountBoundary,
      traceSink ? traceSink : std::make_shared<native_animation::NullNativeAnimationTraceSink>());
#else
  auto pendingStarts = std::make_shared<PendingNativeLayoutStarts>(nativeAnimationService, layoutMountBoundary);
#endif
  layoutMountBoundary->setPostMountObserver(
      [weakPendingStarts = std::weak_ptr<PendingNativeLayoutStarts>(pendingStarts)](const SurfaceId surfaceId) {
        if (const auto pendingStarts = weakPendingStarts.lock()) {
          pendingStarts->drainAfterMount(surfaceId);
        }
      });
  return pendingStarts;
}

void LayoutAnimationsProxyCommon::enqueueNativeLayoutStart(
    const LayoutAnimationType type,
    const ShadowView &oldView,
    const ShadowView &finalView,
    const MountingTransaction::Number transactionNumber,
    native_animation::AnimationRequest request,
    native_animation::AnimationCallbacks callbacks) const {
  react_native_assert(pendingNativeStarts_ != nullptr && "native layout start delivery is not available");
  const auto handle = request.handle;
  pendingNativeStarts_->enqueue({
      handle,
      transactionNumber,
      type,
      finalView.layoutMetrics.frame,
      // The snapshot below keeps this props object alive while pending.
      reinterpret_cast<uintptr_t>(finalView.props.get()),
      std::make_unique<LayoutPendingViewSnapshot>(oldView, finalView),
      std::move(request),
      std::move(callbacks),
  });
}

void LayoutAnimationsProxyCommon::cancelNativeLayoutStart(const native_animation::AnimationHandle &handle) const {
  if (pendingNativeStarts_) {
    pendingNativeStarts_->cancel(handle);
  }
}

LayoutAnimationsProxyCommon::NativeLayoutRouteAttempt LayoutAnimationsProxyCommon::tryStartNativeLayoutAnimation(
    const ShadowView &oldView,
    const ShadowView &finalView,
    const Tag parentTag,
    const MountingTransaction::Number transactionNumber,
    const Snapshot &currentValues,
    const Snapshot &targetValues,
    const std::weak_ptr<const LayoutAnimationsProxyCommon> &weakSelf) const {
  NativeLayoutRouteAttempt attempt;
  if (!nativeAnimationAdapter_ || !pendingNativeStarts_) {
    return attempt;
  }
  const auto surfaceId = finalView.surfaceId;
  const auto tag = finalView.tag;
  const uint64_t buildId = ++commandGeneration_;

  auto &uiRuntime = uiRuntime_;
  const jsi::Object yogaValues(uiRuntime);
  yogaValues.setProperty(uiRuntime, "currentOriginX", currentValues.x);
  yogaValues.setProperty(uiRuntime, "currentGlobalOriginX", currentValues.x);
  yogaValues.setProperty(uiRuntime, "currentOriginY", currentValues.y);
  yogaValues.setProperty(uiRuntime, "currentGlobalOriginY", currentValues.y);
  yogaValues.setProperty(uiRuntime, "currentWidth", currentValues.width);
  yogaValues.setProperty(uiRuntime, "currentHeight", currentValues.height);
  yogaValues.setProperty(uiRuntime, "targetOriginX", targetValues.x);
  yogaValues.setProperty(uiRuntime, "targetGlobalOriginX", targetValues.x);
  yogaValues.setProperty(uiRuntime, "targetOriginY", targetValues.y);
  yogaValues.setProperty(uiRuntime, "targetGlobalOriginY", targetValues.y);
  yogaValues.setProperty(uiRuntime, "targetWidth", targetValues.width);
  yogaValues.setProperty(uiRuntime, "targetHeight", targetValues.height);
  yogaValues.setProperty(uiRuntime, "windowWidth", targetValues.windowWidth);
  yogaValues.setProperty(uiRuntime, "windowHeight", targetValues.windowHeight);
  const auto summary = layoutAnimationsManager_->buildLayoutAnimation(
      uiRuntime,
      tag,
      LayoutAnimationType::LAYOUT,
      yogaValues,
      buildId,
      native_animation::kDefaultResourceBudget.maxTracksPerPlan);
  if (summary.isUndefined()) {
    // No stored build exists; the frame-driven start runs the builder itself.
    return attempt;
  }
  attempt.buildId = buildId;

  const native_animation::AnimationHandle handle{surfaceId, tag, native_animation::AnimationOwner::Layout, buildId};
  auto parsed =
      parseLayoutNativeAnimationBuild(uiRuntime, summary, native_animation::kDefaultResourceBudget.maxTracksPerPlan);
  auto planResult = std::holds_alternative<LayoutNativeAnimationBuildInput>(parsed)
      ? buildLayoutNativeAnimationPlan(
            std::get<LayoutNativeAnimationBuildInput>(parsed),
            {finalView.layoutMetrics.frame.size.width,
             finalView.layoutMetrics.frame.size.height,
             nativeTrackFormSupport_})
      : LayoutPlanBuildResult{std::get<native_animation::TrackBuildFailure>(parsed)};
  if (const auto *failure = std::get_if<native_animation::TrackBuildFailure>(&planResult)) {
    // One failed track routes the whole animation to frame-driven.
    recordNativeAnimationRouteTrace(
        *layoutTraceSink_,
        handle,
        static_cast<uint8_t>(LayoutNativeAnimationRoute::DirectBasic),
        static_cast<uint8_t>(LayoutNativeAnimationRoute::FrameDriven),
        failure->reason);
    return attempt;
  }
  auto plan = std::move(std::get<native_animation::AnimationPlan>(planResult));

  // A replacement continues from what the user sees; a fresh animation starts
  // from the owned builder value.
  std::vector<native_animation::AnimationTarget> targets;
  targets.reserve(plan.tracks.size());
  for (auto &track : plan.tracks) {
    targets.push_back(track.target);
    if (shouldStartFromCurrentVisual(surfaceId, tag, track.target)) {
      track.start = native_animation::CurrentVisualValue{};
    }
  }

  recordNativeAnimationRouteTrace(
      *layoutTraceSink_,
      handle,
      static_cast<uint8_t>(LayoutNativeAnimationRoute::DirectBasic),
      static_cast<uint8_t>(LayoutNativeAnimationRoute::DirectBasic),
      std::nullopt);
  activeNativeLayoutAnimations_[{surfaceId, tag}] = ActiveNativeLayoutAnimation{
      handle, LayoutAnimationType::LAYOUT, std::move(targets), oldView, finalView, parentTag};

  const FrameDrivenLeaseKey key{surfaceId, tag};
  native_animation::AnimationCallbacks callbacks{
      [uiScheduler = uiScheduler_](const native_animation::CallbackOperation &operation) {
        scheduleOnUI(uiScheduler, operation);
      },
      [weakSelf, key, handle](const native_animation::AnimationAdmissionResult result) {
        if (const auto self = weakSelf.lock()) {
          self->handleNativeLayoutAdmission(key.surfaceId, key.tag, handle, result);
        }
      },
      [weakSelf, key, handle](const native_animation::AnimationResult result) {
        if (const auto self = weakSelf.lock()) {
          self->handleNativeLayoutTerminal(key.surfaceId, key.tag, handle, result);
        }
      },
  };
  enqueueNativeLayoutStart(
      LayoutAnimationType::LAYOUT,
      oldView,
      finalView,
      transactionNumber,
      {handle, std::move(plan), native_animation::AnimationAdmissionMode::Normal},
      std::move(callbacks));
  attempt.routedNative = true;
  return attempt;
}

void LayoutAnimationsProxyCommon::handleNativeLayoutAdmission(
    const SurfaceId surfaceId,
    const Tag tag,
    const native_animation::AnimationHandle &handle,
    const native_animation::AnimationAdmissionResult result) const {
  if (result.status != native_animation::AnimationAdmissionStatus::Granted) {
    // The terminal result after a rejection owns fallback and the callback.
    return;
  }
  const auto it = activeNativeLayoutAnimations_.find({surfaceId, tag});
  if (it != activeNativeLayoutAnimations_.end() && it->second.handle == handle) {
    it->second.admissionGranted = true;
  }
}

void LayoutAnimationsProxyCommon::handleNativeLayoutTerminal(
    const SurfaceId surfaceId,
    const Tag tag,
    const native_animation::AnimationHandle &handle,
    const native_animation::AnimationResult result) const {
  std::optional<ActiveNativeLayoutAnimation> record;
  const auto it = activeNativeLayoutAnimations_.find({surfaceId, tag});
  if (it != activeNativeLayoutAnimations_.end() && it->second.handle == handle) {
    record = std::move(it->second);
    activeNativeLayoutAnimations_.erase(it);
  }
  if (result.outcome == native_animation::AnimationOutcome::Rejected && record && !record->admissionGranted &&
      layoutPermitsFallback(result.reason)) {
    // The fallback run delivers the public callback.
    startNativeLayoutFallback(*record);
    return;
  }
  layoutAnimationsManager_->completeNativeBuild(
      uiRuntime_, tag, handle.generation, result.outcome == native_animation::AnimationOutcome::Finished);
}

bool LayoutAnimationsProxyCommon::shouldStartFromCurrentVisual(
    const SurfaceId surfaceId,
    const Tag tag,
    const native_animation::AnimationTarget &target) const {
  const FrameDrivenLeaseKey key{surfaceId, tag};
  if (frameDrivenLeases_.contains(key)) {
    // The lease claims every visual target of the view.
    return true;
  }
  const auto it = activeNativeLayoutAnimations_.find(key);
  if (it == activeNativeLayoutAnimations_.end()) {
    return false;
  }
  return std::ranges::any_of(it->second.targets, [&](const native_animation::AnimationTarget &owned) {
    return native_animation::targetsConflict(owned, target);
  });
}

void LayoutAnimationsProxyCommon::cancelActiveNativeLayoutAnimationsForTag(const Tag tag) const {
  if (!nativeAnimationAdapter_) {
    return;
  }
  for (const auto &[key, record] : activeNativeLayoutAnimations_) {
    if (key.tag != tag) {
      continue;
    }
    // The terminal result consumes the record and delivers the callback.
    cancelNativeLayoutStart(record.handle);
    nativeAnimationAdapter_->cancel(record.handle);
  }
}

void LayoutAnimationsProxyCommon::notifyNativeStartsSurfaceStarted(const SurfaceId surfaceId) const {
  if (pendingNativeStarts_) {
    pendingNativeStarts_->notifySurfaceStarted(surfaceId);
  }
}

void LayoutAnimationsProxyCommon::cancelNativeStartsSurface(const SurfaceId surfaceId) const {
  if (pendingNativeStarts_) {
    pendingNativeStarts_->cancelSurface(surfaceId);
  }
}

std::optional<facebook::react::SurfaceId>
LayoutAnimationsProxyCommon::onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward) {
  return std::nullopt;
}

std::optional<facebook::react::SurfaceId> LayoutAnimationsProxyCommon::onGestureCancel() {
  return std::nullopt;
}

void LayoutAnimationsProxyCommon::startSurface(const SurfaceId surfaceId) {}

void LayoutAnimationsProxyCommon::transferConfigFromNativeID(const std::string &nativeIdString, const int tag) const {
  if (nativeIdString.empty() || nativeIdString.length() > 9) {
    return;
  }

  auto nativeId = 0;
  for (const auto character : nativeIdString) {
    if (character < '0' || character > '9') {
      return;
    }
    nativeId = nativeId * 10 + character - '0';
  }

  layoutAnimationsManager_->transferConfigFromNativeID(nativeId, tag);
}

void LayoutAnimationsProxyCommon::claimFrameDrivenLayoutAnimation(
    const SurfaceId surfaceId,
    const Tag tag,
    const LayoutAnimationType type,
    const std::weak_ptr<const LayoutAnimationsProxyCommon> &weakOwner,
    std::function<void()> onGranted,
    const uint64_t pendingBuildId) const {
  if (!nativeAnimationAdapter_) {
    onGranted();
    return;
  }
  if (type == LayoutAnimationType::ENTERING) {
    rejectedEnteringClaimTags_.erase(tag);
  }
  const FrameDrivenLeaseKey key{surfaceId, tag};
  const native_animation::AnimationHandle handle{
      surfaceId,
      tag,
      native_animation::AnimationOwner::Layout,
      ++commandGeneration_,
  };
  const auto admissionMode = type == LayoutAnimationType::EXITING
      ? native_animation::AnimationAdmissionMode::RetainedExit
      : native_animation::AnimationAdmissionMode::Normal;
  auto lease = std::make_shared<FrameDrivenAnimationLease>(handle);
  nativeAnimationAdapter_->claimFrameDriven(
      {handle, {native_animation::AllVisualTargets{}}, admissionMode},
      {
          [weakOwner = weakOwner,
           key,
           handle,
           tag,
           type,
           lease,
           pendingBuildId,
           adapter = nativeAnimationAdapter_,
           onGranted = std::move(onGranted)](const native_animation::ExternalClaimResult result) {
            const auto owner = weakOwner.lock();
            if (result.status == native_animation::ExternalClaimStatus::Rejected) {
              if (owner) {
                if (pendingBuildId != 0) {
                  // The animation never starts; this is its one terminal result.
                  owner->layoutAnimationsManager_->completeNativeBuild(owner->uiRuntime_, tag, pendingBuildId, false);
                }
                owner->handleRejectedFrameDrivenLayoutAnimation(tag, type, result.reason);
              }
              return;
            }

            const FrameDrivenAnimationLeaseWriteGuard guard{lease};
            if (guard.isRevoked()) {
              return;
            }
            if (!owner) {
              adapter->releaseFrameDriven(handle, native_animation::AnimationOutcome::Cancelled);
              return;
            }
            owner->frameDrivenLeases_[key] = lease;
            // Do not let another thread revoke the lease before the animation starts.
            onGranted();
          },
          {
              {},
              [lease]() { lease->revoke(); },
              [weakOwner = weakOwner, key, handle, tag](const native_animation::AnimationResult result) {
                if (result.outcome == native_animation::AnimationOutcome::Interrupted ||
                    result.outcome == native_animation::AnimationOutcome::SurfaceDestroyed) {
                  if (const auto owner = weakOwner.lock()) {
                    const auto lease = owner->frameDrivenLeases_.find(key);
                    if (lease != owner->frameDrivenLeases_.end() && lease->second->getHandle() == handle) {
                      owner->frameDrivenLeases_.erase(lease);
                      owner->layoutAnimationsManager_->cancelLayoutAnimation(owner->uiRuntime_, tag);
                    }
                  }
                }
              },
          },
      });
}

void LayoutAnimationsProxyCommon::handleRejectedFrameDrivenLayoutAnimation(
    const Tag tag,
    const LayoutAnimationType type,
    const native_animation::AnimationResultReason reason) const {
  switch (reason) {
    case native_animation::AnimationResultReason::TargetUnavailable:
      // The surface or view is gone. Surface teardown owns cleanup.
      return;
    case native_animation::AnimationResultReason::StaleGeneration:
    case native_animation::AnimationResultReason::OwnershipDenied:
    case native_animation::AnimationResultReason::RetainedExitActive:
      // The current owner keeps lifecycle and view cleanup responsibility.
      if (type == LayoutAnimationType::EXITING) {
        layoutAnimationsManager_->clearLayoutAnimationConfig(tag);
      } else if (type == LayoutAnimationType::ENTERING) {
        // The entering animation will not run. Record the tag so the mount
        // code keeps the view visible instead of hiding it for a first
        // animation frame that never comes.
        rejectedEnteringClaimTags_.insert(tag);
      }
      return;
    default:
      return;
  }
}

bool LayoutAnimationsProxyCommon::consumeRejectedEnteringClaim(const Tag tag) const {
  return rejectedEnteringClaimTags_.erase(tag) > 0;
}

void LayoutAnimationsProxyCommon::releaseFrameDrivenLayoutAnimation(
    const SurfaceId surfaceId,
    const Tag tag,
    const native_animation::AnimationOutcome outcome) const {
  if (!nativeAnimationAdapter_) {
    return;
  }
  const FrameDrivenLeaseKey key{surfaceId, tag};
  const auto it = frameDrivenLeases_.find(key);
  if (it == frameDrivenLeases_.end()) {
    return;
  }
  nativeAnimationAdapter_->releaseFrameDriven(it->second->getHandle(), outcome);
  frameDrivenLeases_.erase(it);
}

std::optional<FrameDrivenAnimationLeaseWriteGuard> LayoutAnimationsProxyCommon::lockFrameDrivenLayoutAnimation(
    const SurfaceId surfaceId,
    const Tag tag) const {
  if (!nativeAnimationAdapter_) {
    return FrameDrivenAnimationLeaseWriteGuard{};
  }
  const auto lease = frameDrivenLeases_.find({surfaceId, tag});
  if (lease == frameDrivenLeases_.end()) {
    return std::nullopt;
  }
  FrameDrivenAnimationLeaseWriteGuard guard{lease->second};
  if (guard.isRevoked()) {
    return std::nullopt;
  }
  return guard;
}

#ifdef ANDROID

const facebook::react::ShadowNode *findInShadowTreeByTag(const facebook::react::ShadowNode &node, Tag tag) {
  if (node.getTag() == tag) {
    return &node;
  }
  for (const auto &child : node.getChildren()) {
    if (const auto result = findInShadowTreeByTag(*child, tag)) {
      return result;
    }
  }
  return nullptr;
}

void LayoutAnimationsProxyCommon::restoreOpacityInCaseOfFlakyEnteringAnimation(SurfaceId surfaceId) const {
  std::vector<std::pair<double, Tag>> opacityToRestore;
  for (const auto tag : maybeSettledAnimationTags_) {
    const auto layoutAnimationIt = layoutAnimations_.find(tag);
    if (layoutAnimationIt == layoutAnimations_.end() || !layoutAnimationIt->second.isSettled()) {
      continue;
    }
    const auto &opacity = layoutAnimationIt->second.opacity;
    if (opacity.has_value()) {
      opacityToRestore.emplace_back(std::pair<double, Tag>{opacity.value(), tag});
    }
  }
  if (opacityToRestore.empty()) {
    // Animation was successfully finished, and the opacity was restored, so we
    // don't need to do anything. Only the Entering animation has a set opacity
    // value.
    return;
  }
  const std::weak_ptr<UIManager> weakUiManager = uiManager_;
  jsInvoker_->invokeAsync([=](jsi::Runtime &runtime) {
    auto uiManager = weakUiManager.lock();
    if (!uiManager) {
      return;
    }
    uiManager->getShadowTreeRegistry().visit(surfaceId, [=](ShadowTree const &shadowTree) {
      shadowTree.commit(
          [=](RootShadowNode const &oldRootShadowNode) {
            const auto &rootShadowNode = static_cast<const ShadowNode &>(oldRootShadowNode);
            PropsMap propsMap;
            for (const auto &[opacity, tag] : opacityToRestore) {
              const auto *targetShadowNode = findInShadowTreeByTag(rootShadowNode, tag);
              if (targetShadowNode != nullptr) {
                propsMap[targetShadowNode->getFamilyShared()].emplace_back(folly::dynamic::object("opacity", opacity));
              }
            }
            return cloneShadowTreeWithNewProps(oldRootShadowNode, propsMap);
          },
          {});
    });
  });
}

#endif // ANDROID

} // namespace reanimated

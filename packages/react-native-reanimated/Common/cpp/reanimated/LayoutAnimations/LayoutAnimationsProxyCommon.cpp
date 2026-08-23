#include <ReactCommon/CallInvoker.h>
#include <folly/dynamic.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>

#include <react/utils/hash_combine.h>

#include <functional>
#include <memory>
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

void setSnapshotProperties(
    jsi::Runtime &rt,
    const jsi::Object &values,
    const std::string &prefix,
    const Snapshot &snapshot) {
  values.setProperty(rt, (prefix + "OriginX").c_str(), snapshot.x);
  values.setProperty(rt, (prefix + "GlobalOriginX").c_str(), snapshot.x);
  values.setProperty(rt, (prefix + "OriginY").c_str(), snapshot.y);
  values.setProperty(rt, (prefix + "GlobalOriginY").c_str(), snapshot.y);
  values.setProperty(rt, (prefix + "Width").c_str(), snapshot.width);
  values.setProperty(rt, (prefix + "Height").c_str(), snapshot.height);
  values.setProperty(rt, "windowWidth", snapshot.windowWidth);
  values.setProperty(rt, "windowHeight", snapshot.windowHeight);
}

} // namespace

std::shared_ptr<PendingNativeLayoutStarts> LayoutAnimationsProxyCommon::makePendingNativeLayoutStarts(
    const std::shared_ptr<native_animation::NativeAnimationService> &nativeAnimationService,
    const std::shared_ptr<LayoutMountBoundary> &layoutMountBoundary) {
  if (!useNativeLayoutAnimations() || !nativeAnimationService || !layoutMountBoundary) {
    return nullptr;
  }
  auto pendingStarts = std::make_shared<PendingNativeLayoutStarts>(nativeAnimationService, layoutMountBoundary);
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
jsi::Object LayoutAnimationsProxyCommon::makeEnteringYogaValues(jsi::Runtime &rt, const Snapshot &target) {
  jsi::Object values(rt);
  setSnapshotProperties(rt, values, "target", target);
  return values;
}

jsi::Object LayoutAnimationsProxyCommon::makeExitingYogaValues(jsi::Runtime &rt, const Snapshot &current) {
  jsi::Object values(rt);
  setSnapshotProperties(rt, values, "current", current);
  return values;
}

jsi::Object
LayoutAnimationsProxyCommon::makeLayoutYogaValues(jsi::Runtime &rt, const Snapshot &current, const Snapshot &target) {
  jsi::Object values(rt);
  setSnapshotProperties(rt, values, "current", current);
  setSnapshotProperties(rt, values, "target", target);
  return values;
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
    std::function<void()> onGranted) const {
  if (!nativeAnimationAdapter_) {
    onGranted();
    return;
  }
  if (type == LayoutAnimationType::ENTERING) {
    rejectedEnteringClaimTags_.erase(tag);
  }
  const FrameDrivenLeaseKey key{surfaceId, tag};
  const std::vector<native_animation::AnimationTargetClaim> targets{native_animation::AllVisualTargets{}};
  const auto requestedMode = type == LayoutAnimationType::EXITING
      ? native_animation::AnimationAdmissionMode::RetainedExit
      : native_animation::AnimationAdmissionMode::Normal;

  // One lease serves the merged frame-driven writer of the view. A start that
  // needs no wider claim joins the live lease.
  const auto existingIt = frameDrivenLeases_.find(key);
  const auto existing =
      existingIt != frameDrivenLeases_.end() && !existingIt->second->isRevoked() ? existingIt->second : nullptr;
  if (existing && existing->covers(targets, requestedMode)) {
    onGranted();
    return;
  }

  const native_animation::AnimationHandle handle{
      surfaceId,
      tag,
      native_animation::AnimationOwner::Layout,
      ++frameDrivenGeneration_,
  };
  const auto admissionMode =
      existing && existing->getAdmissionMode() == native_animation::AnimationAdmissionMode::RetainedExit
      ? native_animation::AnimationAdmissionMode::RetainedExit
      : requestedMode;
  auto lease = std::make_shared<FrameDrivenAnimationLease>(handle, targets, admissionMode);
  if (existing) {
    existing->setSuperseded(true);
  }
  nativeAnimationAdapter_->claimFrameDriven(
      {handle, targets, admissionMode},
      {
          [weakOwner = weakOwner,
           key,
           handle,
           tag,
           type,
           lease,
           existing,
           adapter = nativeAnimationAdapter_,
           onGranted = std::move(onGranted)](const native_animation::ExternalClaimResult result) {
            const auto owner = weakOwner.lock();
            if (result.status == native_animation::ExternalClaimStatus::Rejected) {
              if (existing) {
                // The old lease stays live and does not cover this start.
                existing->setSuperseded(false);
              }
              if (owner) {
                owner->handleRejectedFrameDrivenLayoutAnimation(tag, type, result.reason);
                if (existing && type == LayoutAnimationType::EXITING) {
                  owner->finishWithheldRemoval(key);
                }
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
              [weakOwner = weakOwner, key, lease](const native_animation::AnimationResult result) {
                const bool revokedByService = result.outcome == native_animation::AnimationOutcome::Interrupted ||
                    result.outcome == native_animation::AnimationOutcome::SurfaceDestroyed;
                if (!revokedByService || lease->isSuperseded()) {
                  return;
                }
                if (const auto owner = weakOwner.lock()) {
                  owner->settleRevokedFrameDrivenLayoutAnimation(key, lease);
                }
              },
          },
      });
}

// The service revoked the writer's lease. The writer stops here, without the
// JS end notification that a finished animation sends.
void LayoutAnimationsProxyCommon::settleRevokedFrameDrivenLayoutAnimation(
    const FrameDrivenLeaseKey &key,
    const std::shared_ptr<FrameDrivenAnimationLease> &lease) const {
  const auto it = frameDrivenLeases_.find(key);
  if (it == frameDrivenLeases_.end() || it->second != lease) {
    return;
  }
  frameDrivenLeases_.erase(it);
  layoutAnimationsManager_->cancelLayoutAnimation(uiRuntime_, key.tag);
  settleRevokedLayoutAnimation(key.surfaceId, key.tag);
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

// The exit could not start and the view's own writer still holds the lease,
// so no other owner can remove the view. The writer ends with the removal.
void LayoutAnimationsProxyCommon::finishWithheldRemoval(const FrameDrivenLeaseKey &key) const {
  releaseFrameDrivenLayoutAnimation(key.surfaceId, key.tag, native_animation::AnimationOutcome::Cancelled);
  layoutAnimationsManager_->cancelLayoutAnimation(uiRuntime_, key.tag);
  layoutAnimationsManager_->notifyLayoutAnimationEnd(uiRuntime_, key.tag, true);
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

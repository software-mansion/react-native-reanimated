#include <ReactCommon/CallInvoker.h>
#include <folly/dynamic.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>

#include <cstring>

#include <functional>
#include <memory>
#include <mutex>
#include <utility>
#include <vector>

namespace reanimated {

std::optional<facebook::react::SurfaceId>
LayoutAnimationsProxyCommon::onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward) {
  return std::nullopt;
}

std::optional<facebook::react::SurfaceId> LayoutAnimationsProxyCommon::onGestureCancel(int tag) {
  return std::nullopt;
}

void LayoutAnimationsProxyCommon::startSurface(
    const facebook::react::ShadowTree &shadowTree,
    std::weak_ptr<const facebook::react::MountingOverrideDelegate> mountingOverrideDelegate) {
  const auto mountingCoordinator = shadowTree.getMountingCoordinator();
  const auto baseRevision = mountingCoordinator->getBaseRevision();
  if (baseRevision.rootShadowNode) {
    const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
    const auto &size = baseRevision.rootShadowNode->getLayoutMetrics().frame.size;
    window_ = {size.width, size.height};
  }
  mountingCoordinator->setMountingOverrideDelegate(std::move(mountingOverrideDelegate));
}

void LayoutAnimationsProxyCommon::surfaceDidUnmount() {
  cancelAllAnimations();
}

void LayoutAnimationsProxyCommon::cancelAllAnimations() const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
#ifdef ANDROID
  for (auto &[_, pendingStart] : pendingStarts_) {
    pendingStart.handle++;
  }
#endif
  if (layoutAnimations_.empty()) {
    return;
  }
  std::vector<Tag> tags;
  tags.reserve(layoutAnimations_.size());
  for (const auto &[tag, _] : layoutAnimations_) {
    tags.push_back(tag);
  }
  layoutAnimations_.clear();
  maybeSettledAnimationTags_.clear();
  scheduleOnUI(
      uiScheduler_,
      [layoutAnimationsManager = layoutAnimationsManager_, &uiRuntime = uiRuntime_, tags = std::move(tags)]() {
        for (const auto tag : tags) {
          layoutAnimationsManager->cancelLayoutAnimation(uiRuntime, tag);
        }
      });
}

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

void LayoutAnimationsProxyCommon::maybeUpdateWindowDimensions(const ShadowViewMutation &mutation) const {
  if (mutation.type == ShadowViewMutation::Update &&
      !std::strcmp(mutation.oldChildShadowView.componentName, RootComponentName)) {
    window_ = {
        mutation.newChildShadowView.layoutMetrics.frame.size.width,
        mutation.newChildShadowView.layoutMetrics.frame.size.height};
  }
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

void LayoutAnimationsProxyCommon::restoreOpacityInCaseOfFlakyEnteringAnimation() const {
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
  jsInvoker_->invokeAsync([weakUiManager, surfaceId = surfaceId_, opacityToRestore](jsi::Runtime &runtime) {
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

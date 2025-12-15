#include <ReactCommon/CallInvoker.h>
#include <folly/dynamic.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>

#include <functional>
#include <memory>
#include <utility>
#include <vector>

namespace reanimated {

std::optional<facebook::react::SurfaceId>
LayoutAnimationsProxyCommon::onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward) {
  return std::nullopt;
}

std::optional<facebook::react::SurfaceId> LayoutAnimationsProxyCommon::onGestureCancel() {
  return std::nullopt;
}

void LayoutAnimationsProxyCommon::startSurface(const SurfaceId surfaceId) {}

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
  for (const auto tag : finishedAnimationTags_) {
    const auto &opacity = layoutAnimations_[tag].opacity;
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
                propsMap[&targetShadowNode->getFamily()].emplace_back(folly::dynamic::object("opacity", opacity));
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

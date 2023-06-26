#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/ComponentDescriptor.h>
#include <react/renderer/mounting/Differentiator.h>

#include "ReanimatedCommitHook.h"
#include "ShadowTreeCloner.h"

using namespace facebook::react;

namespace reanimated {

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &shadowTree,
    RootShadowNode::Shared const &oldRootShadowNode,
    RootShadowNode::Unshared const &newRootShadowNode) const noexcept {
  if (propsRegistry_->isLastReanimatedRoot(newRootShadowNode)) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // PropsRegistry
    return newRootShadowNode;
  }

  // ShadowTree not commited by Reanimated
  
  // Step 1: Diff trees for Layout Animations
  
  if (auto nativeReanimatedModule = weakNativeReanimatedModule_.lock()) {
    auto mutations = calculateShadowViewMutations(*oldRootShadowNode, *newRootShadowNode);
    auto &layoutAnimationsManager = nativeReanimatedModule->layoutAnimationsManager();
    auto lock = std::lock_guard<std::mutex>(nativeReanimatedModule->tagsMutex_);

    // TODO: convert to switch-case
    for (const auto &mutation : mutations) {
      if (mutation.type == ShadowViewMutation::Create) {
        if (auto props = std::dynamic_pointer_cast<AccessibilityProps const>(mutation.newChildShadowView.props)) {
          auto testId = props->testId;
          if (testId != "" && testId.substr(0, 2) == "LA") {
            int layoutAnimationTag = std::stoi(testId.substr(2));
            if (layoutAnimationsManager.hasLayoutAnimation(layoutAnimationTag, ENTERING)) {
              Tag viewTag = mutation.newChildShadowView.tag;
              layoutAnimationsManager.updateTag(layoutAnimationTag, viewTag, ENTERING);
              nativeReanimatedModule->tagsOfEnteringViews_.emplace_back(viewTag);
            }
          }
        }
      } else if (mutation.type == ShadowViewMutation::Update) {
        if (auto props = std::dynamic_pointer_cast<AccessibilityProps const>(mutation.newChildShadowView.props)) {
          auto testId = props->testId;
          if (testId != "" && testId.substr(0, 2) == "LA") {
            int layoutAnimationTag = std::stoi(testId.substr(2));
            if (layoutAnimationsManager.hasLayoutAnimation(layoutAnimationTag, LAYOUT)) {
              Tag viewTag = mutation.newChildShadowView.tag;
              layoutAnimationsManager.updateTag(layoutAnimationTag, viewTag, LAYOUT);
              nativeReanimatedModule->tagsOfLayoutViews_.emplace_back(viewTag);
            }
          }
        }
      } else if (mutation.type == ShadowViewMutation::Delete) {
        if (auto props = std::dynamic_pointer_cast<AccessibilityProps const>(mutation.oldChildShadowView.props)) {
          auto testId = props->testId;
          if (testId != "" && testId.substr(0, 2) == "LA") {
            int layoutAnimationTag = std::stoi(testId.substr(2));
            if (layoutAnimationsManager.hasLayoutAnimation(layoutAnimationTag, EXITING)) {
              Tag viewTag = mutation.oldChildShadowView.tag;
              layoutAnimationsManager.updateTag(layoutAnimationTag, viewTag, EXITING);
              nativeReanimatedModule->tagsOfExitingViews_.emplace_back(viewTag);
            }
          }
        }
      }
      // TODO: support RemoveDeleteTree
    }
  }

  // Step 2: Apply updates from PropsRegistry

  auto surfaceId = newRootShadowNode->getSurfaceId();

  auto rootNode = newRootShadowNode->ShadowNode::clone(ShadowNodeFragment{});

  ShadowTreeCloner shadowTreeCloner{uiManager_, surfaceId};

  {
    auto lock = propsRegistry_->createLock();

    propsRegistry_->for_each([&](const ShadowNodeFamily &family,
                                 const folly::dynamic &props) {
      auto newRootNode =
          shadowTreeCloner.cloneWithNewProps(rootNode, family, RawProps(props));

      if (newRootNode == nullptr) {
        // this happens when React removed the component but Reanimated
        // still tries to animate it, let's skip update for this specific
        // component
        return;
      }
      rootNode = newRootNode;
    });
  }

  shadowTreeCloner.updateYogaChildren();

  // request Reanimated to skip one commit so that React Native can mount the
  // changes instead of failing 1024 times and crashing the app
  propsRegistry_->pleaseSkipCommit();

  return std::static_pointer_cast<RootShadowNode>(rootNode);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/ComponentDescriptor.h>

#include "FabricUtils.h"
#include "ReanimatedCommitHook.h"

using namespace facebook::react;

namespace reanimated {

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &shadowTree,
    RootShadowNode::Shared const &oldRootShadowNode,
    RootShadowNode::Unshared const &newRootShadowNode) const noexcept {
  auto contextContainer = getContextContainerFromUIManager(&*uiManager_);
  auto surfaceId = newRootShadowNode->getSurfaceId();
  PropsParserContext propsParserContext{surfaceId, *contextContainer};

  auto rootNode = newRootShadowNode->ShadowNode::clone(ShadowNodeFragment{});

  {
    auto lock = propsRegistry_->createLock();

    propsRegistry_->for_each(
        [&](ShadowNodeFamily const &family, const folly::dynamic &dynProps) {
          auto newRootNode =
              rootNode->cloneTree(family, [&](ShadowNode const &oldShadowNode) {
                const auto newProps =
                    oldShadowNode.getComponentDescriptor().cloneProps(
                        propsParserContext,
                        oldShadowNode.getProps(),
                        RawProps(dynProps));

                return oldShadowNode.clone({/* .props = */ newProps});
              });

          if (newRootNode == nullptr) {
            // this happens when React removed the component but Reanimated
            // still tries to animate it, let's skip update for this specific
            // component
            return;
          }

          rootNode = newRootNode;
        });
  }

  auto newRootShadowNode2 = std::static_pointer_cast<RootShadowNode>(rootNode);

  // trigger layout here (commit hooks are executed after RN calls
  // layoutIfNeeded!)
  std::vector<LayoutableShadowNode const *> affectedLayoutableNodes{};
  affectedLayoutableNodes.reserve(1024);
  newRootShadowNode2->layoutIfNeeded(&affectedLayoutableNodes);

  return newRootShadowNode2;
}

} // namespace reanimated

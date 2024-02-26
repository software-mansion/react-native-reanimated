#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/ComponentDescriptor.h>

#include "ReanimatedCommitHook.h"
#include "ReanimatedCommitMarker.h"
#include "ShadowTreeCloner.h"

using namespace facebook::react;

namespace reanimated {

ReanimatedCommitHook::ReanimatedCommitHook(
    const std::shared_ptr<PropsRegistry> &propsRegistry,
    const std::shared_ptr<UIManager> &uiManager,
    std::shared_ptr<LayoutAnimationsProxy> lap)
    : propsRegistry_(propsRegistry), uiManager_(uiManager), lap_(lap) {
  uiManager_->registerCommitHook(*this);
}

ReanimatedCommitHook::~ReanimatedCommitHook() noexcept {
  uiManager_->unregisterCommitHook(*this);
}

ShadowNode::Shared findChild(ShadowNode::Shared root, Tag tag){
  if (root->getTag() == tag){
    return root;
  }
  for (ShadowNode::Shared child: root->getChildren()){
    auto res = findChild(child, tag);
    if (res != nullptr){
      return res;
    }
  }
  return nullptr;
}

ShadowNode::Shared findParent(ShadowNode::Shared root, Tag tag){
  if (root->getTag() == tag){
    return nullptr;
  }
  for (ShadowNode::Shared child: root->getChildren()){
    if (child->getTag() == tag){
      return root;
    }
    auto res = findParent(child, tag);
    if (res != nullptr){
      return res;
    }
  }
  return nullptr;
}

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &,
    RootShadowNode::Shared const &oldRootShadowNode,
#if REACT_NATIVE_MINOR_VERSION >= 73
    RootShadowNode::Unshared const &newRootShadowNode) noexcept {
#else
    RootShadowNode::Unshared const &newRootShadowNode) const noexcept {
#endif
  auto mutations = calculateShadowViewMutations(*oldRootShadowNode, *newRootShadowNode);
      
//  auto createdViews = std::make_shared<std::map<Tag, ShadowView&>>();
      
      for (auto &mutation: mutations){
        if (mutation.type == ShadowViewMutation::Create){
          lap_->tagToNativeID_->insert_or_assign(mutation.newChildShadowView.tag, mutation.newChildShadowView.props->nativeId);
          lap_->transferConfigFromNativeTag(mutation.newChildShadowView.tag);
        }
      }
//  }
      auto rootNode = newRootShadowNode->ShadowNode::clone(ShadowNodeFragment{});
//      {
//        std::unique_lock<std::mutex>(lap_->mutex);
//        for (auto &mutation: mutations){
//          if (mutation.type == ShadowViewMutation::Create){
//            lap_->tagToNativeID_->insert_or_assign(mutation.newChildShadowView.tag, mutation.newChildShadowView.props->nativeId);
//            lap_->transferConfigFromNativeTag(mutation.newChildShadowView.tag);
//            auto child = findChild(rootNode, mutation.newChildShadowView.tag);
//            lap_->createdNodes_->insert_or_assign(mutation.newChildShadowView.tag, child);
//            lap_->createdViews_->insert_or_assign(mutation.newChildShadowView.tag, mutation.newChildShadowView);
////            rootNode = rootNode->cloneTree(child->getFamily(), [](const ShadowNode& node){
////              ShadowNode::Unshared newNode = node.clone({});
////              auto lNode = dynamic_pointer_cast<LayoutableShadowNode>(newNode);
////              lNode->setLayoutMetrics(LayoutMetrics{0,0,10,0});
////              return lNode;
////            });
////            if (lap_->layoutAnimationsManager_->hasLayoutAnimation(mutation.newChildShadowView.tag, LayoutAnimationType::ENTERING)){
//////              auto child = findChild(rootNode, mutation.newChildShadowView.tag);
////              folly::dynamic x = folly::dynamic::object();
////              x.insert("marginTop", 100.0);
////              rootNode = cloneShadowTreeWithNewProps(rootNode, child->getFamily(), RawProps(x));
////            }
//          } else if (mutation.type == ShadowViewMutation::Remove){
//            lap_->removedViews_->insert_or_assign(mutation.oldChildShadowView.tag, mutation.oldChildShadowView);
//            if (lap_->layoutAnimationsManager_->hasLayoutAnimation(mutation.oldChildShadowView.tag, LayoutAnimationType::EXITING)){
////              auto parent = findChild(rootNode, mutation.parentShadowView.tag);
//              auto child = findChild(oldRootShadowNode, mutation.oldChildShadowView.tag);
////              auto childParentTag = child->getFamily().parent_.lock()->tag_;
////              auto parent = child ->getFamily().getAncestors()
//              auto oldParent = findParent(oldRootShadowNode, mutation.oldChildShadowView.tag);
//              auto oldParentTag = oldParent->getTag();
//              auto parent = findChild(rootNode, oldParentTag);
//              if (!parent){
//                continue;
//              }
//              rootNode = rootNode->cloneTree(parent->getFamily(), [child](const ShadowNode& node){
//                auto children = node.getChildren();
//                children.push_back(child);
////                auto cloneParentTag = clone->getFamily().parent_.lock()->tag_;
////                auto child0ParentTag = children[0]->getFamily().parent_.lock()->tag_;
//                ShadowNode::Unshared newNode = node.clone({ShadowNodeFragment::propsPlaceholder(), std::make_shared<ShadowNode::ListOfShared>(children)});
//                return newNode;
//              });
////              rootNode = oldRootShadowNode->ShadowNode::clone({});
//            }
//          } else if (mutation.type == ShadowViewMutation::Update){
//            lap_->modifiedNodes_->insert_or_assign(mutation.newChildShadowView.tag, findChild(oldRootShadowNode, mutation.oldChildShadowView.tag));
//            lap_->modifiedViews_->insert_or_assign(mutation.newChildShadowView.tag, mutation.oldChildShadowView);
////            auto child = findChild(oldRootShadowNode, mutation.oldChildShadowView.tag);
////            auto& lChild = static_cast<const YogaLayoutableShadowNode&>(*child);
//            lap_->modifiedNodesTarget_->insert_or_assign(mutation.newChildShadowView.tag, findChild(rootNode, mutation.newChildShadowView.tag));
////            lap_->modifiedViewsTarget_->insert_or_assign(mutation.newChildShadowView.tag, );
//          }
//        }
//        
////        for (auto kv: *(lap_->removedViews_)){
////          if (lap_->layoutAnimationsManager_->hasLayoutAnimation(kv.first, LayoutAnimationType::EXITING))
////          {
////            Values values;
////            values.x = kv.second.layoutMetrics.frame.origin.x;
////            values.y = kv.second.layoutMetrics.frame.origin.y;
////            values.width = kv.second.layoutMetrics.frame.size.width;
////            values.height = kv.second.layoutMetrics.frame.size.height;
////            lap_->startAnimation(kv.first, LayoutAnimationType::EXITING, values);
////            printf("exiting");
////          }
////        }
//        lap_->removedViews_->clear();
//      }

  if (ReanimatedCommitMarker::isReanimatedCommit()) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // PropsRegistry
    return std::static_pointer_cast<RootShadowNode>(rootNode);
  }

  // ShadowTree not commited by Reanimated, apply updates from PropsRegistry

  {
    auto lock = propsRegistry_->createLock();

    propsRegistry_->for_each(
        [&](const ShadowNodeFamily &family, const folly::dynamic &props) {
          auto newRootNode =
              cloneShadowTreeWithNewProps(rootNode, family, RawProps(props));

          if (newRootNode == nullptr) {
            // this happens when React removed the component but Reanimated
            // still tries to animate it, let's skip update for this specific
            // component
            return;
          }
          rootNode = newRootNode;
        });
  }

  // If the commit comes from React Native then skip one commit from Reanimated
  // since the ShadowTree to be committed by Reanimated may not include the new
  // changes from React Native yet and all changes of animated props will be
  // applied in ReanimatedCommitHook by iterating over PropsRegistry.
  propsRegistry_->pleaseSkipReanimatedCommit();

  return std::static_pointer_cast<RootShadowNode>(rootNode);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

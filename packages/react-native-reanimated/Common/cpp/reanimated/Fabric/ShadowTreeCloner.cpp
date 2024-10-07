#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/ShadowTreeCloner.h>

#include <ranges>
#include <utility>

namespace reanimated {

ShadowNode::Unshared cloneShadowTreeWithNewPropsRecursive(
    const ShadowNode &shadowNode,
    const ChildrenMap &childrenMap,
    const SealedMap &unsealedMap,
    const PropsMap &propsMap) {
  const auto family = &shadowNode.getFamily();
  const auto affectedChildrenIt = childrenMap.find(family);
  const auto propsIt = propsMap.find(family);
    const auto unsealedIt = unsealedMap.find(family);
    auto children = shadowNode.getChildren();

    if (unsealedIt != unsealedMap.end() && unsealedIt->second) {
        shadowNode.ensureUnsealed();
        auto& mutableShadowNode = const_cast<ShadowNode&>(shadowNode);
        auto& layoutableShadowNode = static_cast<YogaLayoutableShadowNode&>(mutableShadowNode);
        
        if (affectedChildrenIt != childrenMap.end()) {
          for (const auto index : affectedChildrenIt->second) {
              auto newChild = cloneShadowTreeWithNewPropsRecursive(*children[index], childrenMap, unsealedMap, propsMap);
              if (newChild != nullptr) {
                  layoutableShadowNode.replaceChild(*children[index], newChild, index);
              }
          }
        }
        
        Props::Shared newProps = nullptr;

        if (propsIt != propsMap.end()) {
          PropsParserContext propsParserContext{
              shadowNode.getSurfaceId(), *shadowNode.getContextContainer()};
          newProps = shadowNode.getProps();
          for (const auto &props : propsIt->second) {
            newProps = shadowNode.getComponentDescriptor().cloneProps(
                propsParserContext, newProps, RawProps(props));
          }
        }
        
        if (newProps != nullptr) {
            auto& props = shadowNode.getProps();
            auto& mutableProps = const_cast<Props::Shared&>(props);
            
            mutableProps = newProps;
            
            layoutableShadowNode.updateYogaProps();
        }

        return nullptr;
    }
    
    
  if (affectedChildrenIt != childrenMap.end()) {
    for (const auto index : affectedChildrenIt->second) {
        auto newChild = cloneShadowTreeWithNewPropsRecursive(*children[index], childrenMap, unsealedMap, propsMap);
        if (newChild != nullptr) {
            children[index] = newChild;
        }
    }
  }

  Props::Shared newProps = nullptr;

  if (propsIt != propsMap.end()) {
    PropsParserContext propsParserContext{
        shadowNode.getSurfaceId(), *shadowNode.getContextContainer()};
    newProps = shadowNode.getProps();
    for (const auto &props : propsIt->second) {
      newProps = shadowNode.getComponentDescriptor().cloneProps(
          propsParserContext, newProps, RawProps(props));
    }
  }

  const auto result = shadowNode.clone(
      {newProps ? newProps : ShadowNodeFragment::propsPlaceholder(),
       std::make_shared<ShadowNode::ListOfShared>(children),
       shadowNode.getState()});

  return result;
}

RootShadowNode::Unshared cloneShadowTreeWithNewProps(
    const RootShadowNode &oldRootNode,
    const PropsMap &propsMap) {
  ChildrenMap childrenMap;
  SealedMap unsealedMap;

  for (auto &[family, _] : propsMap) {
    const auto ancestors = family->getAncestors(oldRootNode);

    for (const auto &[parentNode, index] : ancestors) {
      const auto parentFamily = &parentNode.get().getFamily();
      auto &affectedChildren = childrenMap[parentFamily];

      if (affectedChildren.contains(index)) {
        continue;
      }

      affectedChildren.insert(index);
    }
  }

  // This cast is safe, because this function returns a clone
  // of the oldRootNode, which is an instance of RootShadowNode
    return std::static_pointer_cast<RootShadowNode>(cloneShadowTreeWithNewPropsRecursive(oldRootNode, childrenMap, unsealedMap, propsMap));;
}

RootShadowNode::Unshared cloneShadowTreeWithNewProps(
    const RootShadowNode::Unshared &oldRootNode,
    const PropsMap &propsMap,
    bool canModifyRoot) {
  ChildrenMap childrenMap;
  SealedMap unsealedMap;

  for (auto &[family, _] : propsMap) {
    const auto ancestors = family->getAncestors(*oldRootNode);
      bool canCloneInPlace = canModifyRoot;

    for (const auto &[parentNode, index] : ancestors) {
      const auto parentFamily = &parentNode.get().getFamily();
        const auto layoutableParentNode = dynamic_cast<const YogaLayoutableShadowNode*>(&parentNode.get());
        const auto childNode = std::static_pointer_cast<const YogaLayoutableShadowNode>(parentNode.get().getChildren()[index]);

        unsealedMap[parentFamily] = canCloneInPlace;
        
        if (!layoutableParentNode->doesOwn(*childNode)) {
            canCloneInPlace = false;
        }
        
        unsealedMap[&childNode->getFamily()] = canCloneInPlace;
            
      auto &affectedChildren = childrenMap[parentFamily];

      if (affectedChildren.contains(index)) {
        continue;
      }

      affectedChildren.insert(index);
    }
  }
    
    if (canModifyRoot) {
        auto& mutableRoot = const_cast<RootShadowNode&>(*oldRootNode);
        auto& layoutableRoot = static_cast<YogaLayoutableShadowNode&>(mutableRoot);
        
        for (auto child : oldRootNode->getChildren()) {
            const auto affectedChildrenIt = childrenMap.find(&child.get()->getFamily());
            const auto propsIt = propsMap.find(&child.get()->getFamily());
            
            if (affectedChildrenIt != childrenMap.end() || propsIt != propsMap.end()) {
                auto newChild = cloneShadowTreeWithNewPropsRecursive(*child, childrenMap, unsealedMap, propsMap);
                
                if (newChild != nullptr) {
                    layoutableRoot.replaceChild(*child, newChild);
                }
            }
        }
    }

    return oldRootNode;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED

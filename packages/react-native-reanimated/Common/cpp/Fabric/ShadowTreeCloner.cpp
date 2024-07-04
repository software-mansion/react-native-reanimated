#ifdef RCT_NEW_ARCH_ENABLED

#include <utility>

#include "ShadowTreeCloner.h"

namespace reanimated {

ShadowNode::Unshared cloneShadowTreeWithNewPropsRecursive(std::unordered_map<const ShadowNodeFamily*, std::unordered_set<int>> &childrenMap, const ShadowNode::Shared &shadowNode, std::unordered_map<const ShadowNodeFamily*, std::vector<std::shared_ptr<RawProps>>> &propsMap){
  auto family = &shadowNode->getFamily();
  auto children = shadowNode->getChildren();
  auto& childrenSet = childrenMap[family];
  
  for (auto& index: childrenSet){
    children[index] = cloneShadowTreeWithNewPropsRecursive(childrenMap, children[index], propsMap);
  }
  
  Props::Shared newProps = nullptr;
  
  if (propsMap.contains(family)){
    PropsParserContext propsParserContext{shadowNode->getSurfaceId(), *shadowNode->getContextContainer()};
    newProps = shadowNode->getProps();
    for (auto& props: propsMap[family]){
      newProps = shadowNode->getComponentDescriptor().cloneProps(propsParserContext, newProps, std::move(*props));
    }
  }
  
  auto result = shadowNode->clone(
      {newProps ? newProps : ShadowNodeFragment::propsPlaceholder(),
       std::make_shared<ShadowNode::ListOfShared>(children),
        shadowNode->getState()});
  
  return result;
}

ShadowNode::Unshared cloneShadowTreeWithNewProps(
    const ShadowNode::Shared &oldRootNode,
    std::vector<ShadowNode::Shared> nodes,
    std::unordered_map<const ShadowNodeFamily*, std::vector<std::shared_ptr<RawProps>>> &propsMap) {
  std::unordered_map<const ShadowNodeFamily*, std::unordered_set<int>> childrenMap;
  
  for (auto &node: nodes){
    auto ancestors = node->getFamily().getAncestors(*oldRootNode);
    
    for (auto it = ancestors.rbegin(); it != ancestors.rend(); ++it) {
      auto& parentNode = it->first.get();
      auto index = it->second;
      auto family = &parentNode.getFamily();
      auto& childrenSet = childrenMap[family];
      
      childrenSet.insert(index);
      
      if (childrenSet.size() > 1){
        break;
      }
    }
  }

  return cloneShadowTreeWithNewPropsRecursive(childrenMap, oldRootNode, propsMap);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
